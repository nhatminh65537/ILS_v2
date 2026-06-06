import mimetypes
import os

from django.conf import settings
from django.db import transaction
from django.db.models import Max, Q
from django.db.models.functions import Lower
from django.utils import timezone
from django.utils.text import slugify

from api.models import (
    Challenge,
    ChallengeFile,
    ChallengeGitlab,
    ChallengeInstance,
    ChallengeNode,
    ChallengeTagMap,
    UserChallengeProgress,
    UserChallengeSubmit,
    UserProfile,
)
from api.services.gitlab_service import GitlabService
from api.utils import get_config
from auth_app.constants import PERM_MATERIAL_READ_ARCHIVE, PERM_MATERIAL_READ_DRAFT


class ChallengeService:
    """Domain operations for challenge flows."""

    @staticmethod
    def _can_read_draft(user) -> bool:
        if not user or not user.is_authenticated:
            return False
        return user.has_permission(PERM_MATERIAL_READ_DRAFT)

    @staticmethod
    def _can_read_archive(user) -> bool:
        if not user or not user.is_authenticated:
            return False
        return user.has_permission(PERM_MATERIAL_READ_ARCHIVE)

    @classmethod
    def _allowed_statuses(cls, user) -> set:
        allowed = {Challenge.Status.PUBLISHED}
        if cls._can_read_draft(user):
            allowed.add(Challenge.Status.DRAFT)
        if cls._can_read_archive(user):
            allowed.add(Challenge.Status.ARCHIVED)
        return allowed

    @classmethod
    def filter_visible_learn_challenges(cls, queryset, user, query_params):
        allowed = cls._allowed_statuses(user)
        status_param = query_params.get('status')
        if status_param:
            if status_param in allowed:
                queryset = queryset.filter(status=status_param)
            else:
                queryset = queryset.none()
        else:
            queryset = queryset.filter(status__in=allowed)

        difficulty = query_params.get('difficulty')
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)

        category = query_params.get('category') or query_params.get('category_id')
        if category:
            queryset = queryset.filter(category_id=category)

        search = query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)

        # Tag AND-filter: ``?tags=1,2,3`` keeps only challenges carrying *all* of
        # the requested tags (each id adds its own join so they AND together).
        tag_ids = cls._parse_tag_ids(query_params.get('tags'))
        for tag_id in tag_ids:
            queryset = queryset.filter(tag_mappings__tag_id=tag_id)
        if tag_ids:
            queryset = queryset.distinct()

        # Solved filter (?solved=true|false) relative to the requesting user.
        solved_param = (query_params.get('solved') or '').strip().lower()
        if solved_param in {'true', 'false'} and user and user.is_authenticated:
            solved_ids = UserChallengeProgress.objects.filter(
                user=user, completed_at__isnull=False
            ).values_list('challenge_id', flat=True)
            if solved_param == 'true':
                queryset = queryset.filter(id__in=solved_ids)
            else:
                queryset = queryset.exclude(id__in=solved_ids)

        return queryset.select_related('category').prefetch_related('tag_mappings__tag').order_by('id')

    @staticmethod
    def _parse_tag_ids(raw):
        if not raw:
            return []
        ids = []
        for part in str(raw).split(','):
            part = part.strip()
            if not part:
                continue
            try:
                ids.append(int(part))
            except ValueError:
                continue
        seen = set()
        unique = []
        for tag_id in ids:
            if tag_id not in seen:
                seen.add(tag_id)
                unique.append(tag_id)
        return unique

    @classmethod
    def filter_visible_challenges(cls, queryset, user, query_params):
        return cls.filter_visible_learn_challenges(queryset, user, query_params)

    @staticmethod
    def solved_challenge_ids(user, challenge_ids=None):
        """Return the set of solved challenge ids for ``user`` (optionally scoped)."""
        if not user or not user.is_authenticated:
            return set()
        qs = UserChallengeProgress.objects.filter(user=user, completed_at__isnull=False)
        if challenge_ids is not None:
            ids = [cid for cid in challenge_ids if cid is not None]
            if not ids:
                return set()
            qs = qs.filter(challenge_id__in=ids)
        return set(qs.values_list('challenge_id', flat=True))

    # ------------------------------------------------------------------
    # Attachment files (manual upload + GitLab sync share this storage)
    # ------------------------------------------------------------------

    @staticmethod
    def _safe_filename(name: str) -> str:
        """Strip any directory components and reject path traversal.

        Keeps the basename only so a malicious ``../../etc`` filename cannot
        escape the challenge media folder.
        """
        base = os.path.basename((name or '').strip().replace('\\', '/'))
        # Drop leading dots so hidden/relative names don't sneak through.
        base = base.lstrip('.') or 'file'
        return base

    @classmethod
    def _storage_key(cls, challenge, filename: str) -> str:
        return f'challenges/{challenge.slug}/{cls._safe_filename(filename)}'

    @staticmethod
    def _absolute_media_path(storage_key: str) -> str:
        return os.path.join(settings.MEDIA_ROOT, storage_key.replace('/', os.sep))

    @staticmethod
    def list_files(challenge):
        return ChallengeFile.objects.filter(challenge=challenge).order_by('filename', 'id')

    @classmethod
    def store_bytes(cls, challenge, filename, data, source, gitlab_path=None, actor=None):
        """Write ``data`` bytes to media and upsert a ``ChallengeFile`` row.

        Re-storing the same filename overwrites the file on disk and updates the
        existing row (so a GitLab re-sync replaces, not duplicates).
        """
        safe_name = cls._safe_filename(filename)
        storage_key = cls._storage_key(challenge, safe_name)
        abs_path = cls._absolute_media_path(storage_key)

        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        with open(abs_path, 'wb') as fh:
            fh.write(data)

        content_type = mimetypes.guess_type(safe_name)[0]
        now = timezone.now()

        challenge_file, created = ChallengeFile.objects.update_or_create(
            challenge=challenge,
            storage_key=storage_key,
            defaults={
                'filename': safe_name,
                'size': len(data),
                'content_type': content_type,
                'source': source,
                'gitlab_path': gitlab_path,
                'updated_by': actor,
                'updated_at': now,
            },
        )
        if created:
            challenge_file.created_by = actor
            challenge_file.created_at = now
            challenge_file.save(update_fields=['created_by', 'created_at'])
        return challenge_file

    @classmethod
    def save_uploaded_file(cls, challenge, django_file, actor=None):
        """Persist a multipart-uploaded file as a ``source='upload'`` attachment."""
        data = django_file.read()
        return cls.store_bytes(
            challenge,
            django_file.name,
            data,
            source=ChallengeFile.Source.UPLOAD,
            actor=actor,
        )

    @classmethod
    def delete_file(cls, challenge_file):
        """Delete the DB row and unlink the physical media file (best-effort)."""
        abs_path = cls._absolute_media_path(challenge_file.storage_key)
        try:
            if os.path.isfile(abs_path):
                os.remove(abs_path)
        except OSError:
            # The DB row is the source of truth; a missing/locked file on disk
            # must not block removal of the record.
            pass
        challenge_file.delete()

    # ------------------------------------------------------------------
    # Tree / file-explorer operations
    # ------------------------------------------------------------------

    @staticmethod
    def compute_node_path(parent):
        if not parent:
            return ''
        if parent.path:
            return f'{parent.path}.{parent.id}'
        return str(parent.id)

    @staticmethod
    def _depth_for_path(path):
        if not path:
            return 0
        return path.count('.') + 1

    @classmethod
    def validate_max_depth(cls, parent, max_depth):
        candidate_path = cls.compute_node_path(parent)
        depth = cls._depth_for_path(candidate_path)
        if depth > max_depth:
            raise ValueError('Maximum folder depth exceeded')
        return depth

    @staticmethod
    def _unique_slug_from_title(title):
        base = slugify(title) or 'challenge'
        candidate = base
        index = 2
        while Challenge.objects.filter(slug=candidate).exists():
            candidate = f'{base}-{index}'
            index += 1
        return candidate

    @classmethod
    def create_challenge_node_atomic(cls, payload, actor):
        """Create a challenge tree node.

        ``is_item=False`` -> create a folder node only.
        ``is_item=True``  -> atomically create a draft ``Challenge`` plus the
        ``ChallengeNode`` pointing at it (caller navigates to the editor).
        """
        max_depth = int(get_config('challenge.max_tree_depth', default=5) or 5)

        parent = None
        parent_id = payload.get('parent_id', None)
        if parent_id is not None:
            parent = ChallengeNode.objects.get(id=parent_id)
            if parent.is_item:
                raise ValueError('Parent must be a folder node')

        cls.validate_max_depth(parent, max_depth)

        title = (payload.get('title') or '').strip()
        if not title:
            raise ValueError('title is required')

        # End-of-list position keeps the column meaningful for forward-compat even
        # though challenge ordering is title-based (no manual reorder).
        max_position = (
            ChallengeNode.objects.filter(parent_id=parent_id)
            .aggregate(max_position=Max('position'))
            .get('max_position')
        )
        position = 0 if max_position is None else max_position + 1

        is_item = bool(payload.get('is_item'))
        now = timezone.now()

        with transaction.atomic():
            challenge = None
            if is_item:
                slug = cls._unique_slug_from_title(title)
                challenge = Challenge.objects.create(
                    slug=slug,
                    title=title,
                    status=Challenge.Status.DRAFT,
                    source=Challenge.Source.MANUAL,
                    storage_path=f'challenges/{slug}',
                    instance_required=False,
                    challenge_point=0,
                    created_by=actor,
                    updated_by=actor,
                )

            node = ChallengeNode.objects.create(
                parent=parent,
                is_item=is_item,
                title=title,
                position=position,
                challenge=challenge,
                path=cls.compute_node_path(parent),
                created_by=actor,
                updated_by=actor,
                created_at=now,
                updated_at=now,
            )

        return node

    @classmethod
    def move_challenge_node_bulk(cls, node, new_parent):
        """Move ``node`` under ``new_parent`` and bulk-update descendant paths.

        Mirrors ``CourseService.move_course_node_bulk`` to avoid the per-node
        ``BaseNode.rebuild_path`` N+1 saves. The challenge tree is global, so
        there is no course scoping or structure-version bump.
        """
        max_depth = int(get_config('challenge.max_tree_depth', default=5) or 5)

        if new_parent is not None and new_parent.is_item:
            raise ValueError('Parent must be a folder node')

        old_path = node.path
        old_prefix = f'{old_path}.{node.id}' if old_path else str(node.id)

        if new_parent is not None:
            if new_parent.id == node.id:
                raise ValueError('Node cannot be parent of itself')
            if new_parent.path == old_prefix or new_parent.path.startswith(f'{old_prefix}.'):
                raise ValueError('Moving to this parent would create a cycle')
            # Belt-and-suspenders: walk the parent chain in case path data is stale.
            ancestor = new_parent
            while ancestor is not None:
                if ancestor.id == node.id:
                    raise ValueError('Moving to this parent would create a cycle')
                ancestor = ancestor.parent

        new_path = cls.compute_node_path(new_parent)
        cls.validate_max_depth(new_parent, max_depth)

        new_prefix = f'{new_path}.{node.id}' if new_path else str(node.id)

        old_depth = cls._depth_for_path(old_path)
        new_depth = cls._depth_for_path(new_path)
        depth_delta = new_depth - old_depth

        descendants = list(
            ChallengeNode.objects
            .filter(Q(path=old_prefix) | Q(path__startswith=f'{old_prefix}.'))
            .only('id', 'path', 'updated_at')
        )

        for descendant in descendants:
            descendant_depth = cls._depth_for_path(descendant.path)
            if descendant_depth + depth_delta > max_depth:
                raise ValueError('Maximum folder depth exceeded')

        with transaction.atomic():
            now = timezone.now()
            node.parent = new_parent
            node.path = new_path
            node.updated_at = now
            node.save(update_fields=['parent', 'path', 'updated_at'])

            for descendant in descendants:
                descendant.path = f'{new_prefix}{descendant.path[len(old_prefix):]}'
                descendant.updated_at = now

            if descendants:
                ChallengeNode.objects.bulk_update(descendants, ['path', 'updated_at'])

    @classmethod
    def list_explorer_children(cls, parent, user):
        """Folders + visible challenge items directly under ``parent`` (root if None).

        Folders sort before items; both sorted by case-insensitive title. Item
        visibility follows the requesting user's allowed statuses (members get
        published-only).
        """
        qs = (
            ChallengeNode.objects.filter(parent=parent)
            .select_related('challenge', 'challenge__category')
            .prefetch_related('challenge__tag_mappings__tag')
            .order_by('is_item', Lower('title'), 'id')
        )
        allowed = cls._allowed_statuses(user)
        visible = []
        for node in qs:
            if node.is_item:
                if node.challenge is None or node.challenge.status not in allowed:
                    continue
            visible.append(node)
        return visible

    @staticmethod
    def build_breadcrumb(parent):
        """Return ancestor trail (root-first) for a folder node, including itself."""
        if parent is None:
            return []
        ancestor_ids = [int(x) for x in parent.path.split('.') if x] if parent.path else []
        crumbs = []
        if ancestor_ids:
            ancestors = {n.id: n for n in ChallengeNode.objects.filter(id__in=ancestor_ids)}
            for aid in ancestor_ids:
                node = ancestors.get(aid)
                if node is not None:
                    crumbs.append({'id': node.id, 'title': node.title})
        crumbs.append({'id': parent.id, 'title': parent.title})
        return crumbs

    @staticmethod
    def build_slug_suggestions(base_slug, limit=5):
        normalized = (base_slug or '').strip().lower().strip('-')
        if not normalized:
            normalized = 'challenge'

        existing = set(
            Challenge.objects.filter(slug__startswith=normalized).values_list('slug', flat=True)
        )

        suggestions = []
        if normalized not in existing:
            suggestions.append(normalized)

        index = 2
        while len(suggestions) < limit:
            candidate = f'{normalized}-{index}'
            if candidate not in existing:
                suggestions.append(candidate)
            index += 1

        return suggestions

    @staticmethod
    def upsert_challenge_tags(challenge, tag_ids):
        tag_ids = sorted(set(tag_ids or []))

        existing_mappings = {
            mapping.tag_id: mapping
            for mapping in ChallengeTagMap.objects.filter(challenge=challenge)
        }

        keep_ids = set(tag_ids)
        stale_ids = [tag_id for tag_id in existing_mappings if tag_id not in keep_ids]
        if stale_ids:
            ChallengeTagMap.objects.filter(challenge=challenge, tag_id__in=stale_ids).delete()

        missing_ids = [tag_id for tag_id in tag_ids if tag_id not in existing_mappings]
        if missing_ids:
            ChallengeTagMap.objects.bulk_create(
                [ChallengeTagMap(challenge=challenge, tag_id=tag_id) for tag_id in missing_ids]
            )

    @staticmethod
    def resolve_instance_flag_hash(challenge, user):
        if not challenge.instance_required:
            return None

        try:
            instance = ChallengeInstance.objects.get(
                user=user,
                challenge=challenge,
                status=ChallengeInstance.InstanceStatus.RUNNING,
            )
            return instance.flag_value
        except ChallengeInstance.DoesNotExist as exc:
            raise LookupError('No running instance found for this challenge') from exc

    @staticmethod
    def get_primary_flag(challenge):
        return challenge.flags.first()

    @staticmethod
    def record_submission(user, challenge, submitted_flag, is_correct):
        UserChallengeSubmit.objects.create(
            user=user,
            challenge=challenge,
            submitted_flag=submitted_flag,
            is_correct=is_correct,
        )

    @staticmethod
    def handle_correct_submission(user, challenge):
        progress, _ = UserChallengeProgress.objects.get_or_create(user=user, challenge=challenge)
        if progress.completed_at:
            return

        progress.completed_at = timezone.now()
        progress.save()

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.total_challenge_point += challenge.challenge_point
        profile.challenge_completed += 1
        profile.save()
        profile.update_leaderboard_rank()

        # Completion notification is emitted by the post_save signal on
        # UserChallengeProgress (handle_challenge_progress_saved). Do NOT create
        # one here too, or the user receives a duplicate notification.

    @staticmethod
    def get_running_instance(challenge, user):
        return ChallengeInstance.objects.filter(
            user=user,
            challenge=challenge,
            status=ChallengeInstance.InstanceStatus.RUNNING,
        ).first()

    @staticmethod
    def create_instance(challenge, user):
        return ChallengeInstance.objects.create(user=user, challenge=challenge)

    @staticmethod
    def start_instance(instance):
        try:
            instance.start()
        except Exception as exc:
            raise RuntimeError(str(exc)) from exc

    # ------------------------------------------------------------------
    # GitLab import / sync (Task 6.8 Phase 2)
    # ------------------------------------------------------------------

    # Default file selection offered/checked in the import picker.
    DEFAULT_GITLAB_FILES = ('attachment.zip', 'README.md')
    README_FILENAME = 'README.md'

    @classmethod
    def import_from_gitlab(cls, *, project_id, parent_node_id, selected_files, actor):
        """Import a GitLab project as a new gitlab-sourced challenge.

        Fetches project metadata + README and downloads the ``selected_files``
        FIRST (so a GitLab failure aborts before any DB write). Then atomically
        creates the Challenge + ChallengeNode + ChallengeGitlab and stores the
        downloaded bytes as ``source='gitlab'`` attachment files.

        Raises:
            ValueError: invalid parent node or empty title (-> 400).
            GitlabConfigError / GitlabUnavailableError / GitlabNotFoundError:
                propagated from GitlabService (mapped to HTTP by the caller).
        """
        project = GitlabService.get_project(project_id)
        ref = project['default_branch']
        commit_sha = GitlabService.get_latest_commit_sha(project_id, ref)
        readme = GitlabService.get_raw_file_text(project_id, cls.README_FILENAME, ref)

        # Download all selected files up front (fetch-first); README is metadata,
        # not necessarily an attachment, so it's excluded from the file payload
        # unless explicitly selected.
        downloads = []
        for path in (selected_files or []):
            downloads.append((path, GitlabService.get_raw_file(project_id, path, ref)))

        title = (project['name'] or project['path_with_namespace'] or 'challenge').strip()
        if not title:
            raise ValueError('GitLab project has no usable name.')

        parent = None
        if parent_node_id is not None:
            parent = ChallengeNode.objects.get(id=parent_node_id)
            if parent.is_item:
                raise ValueError('Parent must be a folder node')

        max_depth = int(get_config('challenge.max_tree_depth', default=5) or 5)
        cls.validate_max_depth(parent, max_depth)

        max_position = (
            ChallengeNode.objects.filter(parent=parent)
            .aggregate(max_position=Max('position'))
            .get('max_position')
        )
        position = 0 if max_position is None else max_position + 1

        slug = cls._unique_slug_from_title(title)
        now = timezone.now()

        with transaction.atomic():
            challenge = Challenge.objects.create(
                slug=slug,
                title=title,
                description=readme or '',
                status=Challenge.Status.DRAFT,
                source=Challenge.Source.GITLAB,
                storage_path=f'challenges/{slug}',
                gitlab_path=project['path_with_namespace'],
                instance_required=False,
                challenge_point=0,
                created_by=actor,
                updated_by=actor,
            )

            ChallengeNode.objects.create(
                parent=parent,
                is_item=True,
                title=title,
                position=position,
                challenge=challenge,
                path=cls.compute_node_path(parent),
                created_by=actor,
                updated_by=actor,
                created_at=now,
                updated_at=now,
            )

            ChallengeGitlab.objects.create(
                challenge=challenge,
                project_id=project['id'],
                project_url=project['web_url'],
                default_branch=ref,
                last_commit_sha=commit_sha,
                last_synced_at=now,
                created_by=actor,
                updated_by=actor,
            )

            for path, data in downloads:
                cls.store_bytes(
                    challenge,
                    path.split('/')[-1],
                    data,
                    source=ChallengeFile.Source.GITLAB,
                    gitlab_path=path,
                    actor=actor,
                )

        return challenge

    @classmethod
    def sync_gitlab(cls, *, challenge, actor):
        """Re-pull README + gitlab-sourced files from the linked GitLab project.

        Fetch-first then write: refetch README -> ``description`` and re-download
        every existing ``source='gitlab'`` file, then bump ``last_commit_sha`` /
        ``last_synced_at``. On GitLab failure the exception propagates and no DB
        write happens, so old content is preserved (caller maps to HTTP 503).

        Raises:
            ValueError: challenge is not linked to GitLab (-> 400).
        """
        gitlab_info = ChallengeGitlab.objects.filter(challenge=challenge).first()
        if gitlab_info is None:
            raise ValueError('Challenge is not linked to GitLab.')

        project_id = gitlab_info.project_id
        ref = gitlab_info.default_branch or 'main'

        commit_sha = GitlabService.get_latest_commit_sha(project_id, ref)
        readme = GitlabService.get_raw_file_text(project_id, cls.README_FILENAME, ref)

        gitlab_files = list(
            ChallengeFile.objects.filter(
                challenge=challenge, source=ChallengeFile.Source.GITLAB
            )
        )
        # Re-download each tracked file (fetch-first). A file removed from the
        # repo raises GitlabNotFoundError -> 503; old content stays intact.
        refreshed = []
        for cf in gitlab_files:
            path = cf.gitlab_path or cf.filename
            refreshed.append((cf, GitlabService.get_raw_file(project_id, path, ref)))

        now = timezone.now()
        with transaction.atomic():
            if readme is not None:
                challenge.description = readme
                challenge.updated_by = actor
                challenge.updated_at = now
                challenge.save(update_fields=['description', 'updated_by', 'updated_at'])

            for cf, data in refreshed:
                cls.store_bytes(
                    challenge,
                    cf.filename,
                    data,
                    source=ChallengeFile.Source.GITLAB,
                    gitlab_path=cf.gitlab_path,
                    actor=actor,
                )

            gitlab_info.last_commit_sha = commit_sha
            gitlab_info.last_synced_at = now
            gitlab_info.updated_by = actor
            gitlab_info.updated_at = now
            gitlab_info.save(
                update_fields=['last_commit_sha', 'last_synced_at', 'updated_by', 'updated_at']
            )

        return gitlab_info
