from django.utils import timezone
from django.db import transaction
from django.db.models import Count, F, Max, Q

from api.models import Course, CourseNode, CourseTagMap, Lesson, UserCourseProgress, UserLessonProgress
from api.utils import get_config
from auth_app.constants import (
    PERM_MATERIAL_PURGE,
    PERM_MATERIAL_READ_ARCHIVE,
    PERM_MATERIAL_READ_DRAFT,
)


class CourseService:
    """Domain operations for course view flows."""

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
        allowed = {Course.Status.PUBLISHED}
        if cls._can_read_draft(user):
            allowed.add(Course.Status.DRAFT)
        if cls._can_read_archive(user):
            allowed.add(Course.Status.ARCHIVED)
        return allowed

    @staticmethod
    def filter_visible_courses(queryset, user, query_params):
        return CourseService.filter_visible_learn_courses(queryset, user, query_params)

    @classmethod
    def filter_visible_learn_courses(cls, queryset, user, query_params):
        allowed = cls._allowed_statuses(user)
        status_param = query_params.get('status')
        if status_param:
            if status_param in allowed:
                queryset = queryset.filter(status=status_param)
            else:
                queryset = queryset.none()
        else:
            queryset = queryset.filter(status__in=allowed)

        category = query_params.get('category') or query_params.get('category_id')
        if category:
            queryset = queryset.filter(category_id=category)

        search = query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)

        # Tag AND-filter: ``?tags=1,2,3`` keeps only courses carrying *all* of the
        # requested tags. Each tag id adds its own join so the conditions AND
        # together (a single ``__in`` would be OR semantics).
        tag_ids = cls._parse_tag_ids(query_params.get('tags'))
        for tag_id in tag_ids:
            queryset = queryset.filter(tag_mappings__tag_id=tag_id)
        if tag_ids:
            queryset = queryset.distinct()

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
        # Preserve order but drop duplicates so repeated joins aren't generated.
        seen = set()
        unique = []
        for tag_id in ids:
            if tag_id not in seen:
                seen.add(tag_id)
                unique.append(tag_id)
        return unique

    @staticmethod
    def get_course_tree_nodes(course):
        return CourseNode.objects.filter(course=course, parent__isnull=True).prefetch_related('children', 'lesson')

    @classmethod
    def get_visible_course_by_slug(cls, slug, user):
        queryset = Course.objects.filter(slug=slug, status__in=cls._allowed_statuses(user))
        return queryset.get()

    @staticmethod
    def get_course_node_or_404(course, node_id):
        return CourseNode.objects.get(course_id=course.id, id=node_id)

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
    def bump_course_structure_version(course_id):
        Course.objects.filter(id=course_id).update(structure_version=F('structure_version') + 1)

    @classmethod
    def create_course_node_atomic(cls, course, payload, actor):
        max_depth = int(get_config('learn.max_tree_depth', default=5) or 5)
        parent = None
        parent_id = payload.get('parent_id', None)
        if parent_id is not None:
            parent = CourseNode.objects.get(course_id=course.id, id=parent_id)
            if parent.is_item:
                raise ValueError('Parent must be a folder node')

        cls.validate_max_depth(parent, max_depth)

        title = (payload.get('title') or '').strip()
        if not title:
            raise ValueError('title is required')

        # Default new nodes to the end of their sibling list so the UI never has
        # to ask for a position; explicit positions (legacy callers) still win.
        position = payload.get('position', None)
        if position is None:
            max_position = (
                CourseNode.objects.filter(course_id=course.id, parent_id=parent_id)
                .aggregate(max_position=Max('position'))
                .get('max_position')
            )
            position = 0 if max_position is None else max_position + 1
        is_item = bool(payload.get('is_item'))
        lesson_payload = payload.get('lesson')

        now = timezone.now()

        with transaction.atomic():
            lesson = None
            if is_item:
                if not lesson_payload:
                    raise ValueError('lesson is required when is_item=true')

                lesson_title = (lesson_payload.get('title') or title).strip()
                if not lesson_title:
                    raise ValueError('lesson.title is required')

                lesson_fields = {
                    'title': lesson_title,
                    'lesson_type': lesson_payload.get('lesson_type'),
                    'source': lesson_payload.get('source') or Lesson.Source.MANUAL,
                    'content_md': lesson_payload.get('content_md'),
                    'video_url': lesson_payload.get('video_url'),
                    'video_duration': lesson_payload.get('video_duration'),
                    'learning_point': lesson_payload.get('learning_point', 0),
                    'learning_time': lesson_payload.get('learning_time'),
                    'created_by': actor,
                    'updated_by': actor,
                }
                lesson = Lesson.objects.create(**lesson_fields)

            node = CourseNode.objects.create(
                course=course,
                parent=parent,
                is_item=is_item,
                title=title,
                position=position,
                lesson=lesson,
                path=cls.compute_node_path(parent),
                created_by=actor,
                updated_by=actor,
                created_at=now,
                updated_at=now,
            )

            cls.bump_course_structure_version(course.id)

        return node

    @classmethod
    def move_course_node_bulk(cls, node, new_parent):
        max_depth = int(get_config('learn.max_tree_depth', default=5) or 5)

        if new_parent is not None:
            if new_parent.course_id != node.course_id:
                raise ValueError('Parent must belong to the same course')
            if new_parent.is_item:
                raise ValueError('Parent must be a folder node')

        old_path = node.path
        old_prefix = f'{old_path}.{node.id}' if old_path else str(node.id)

        if new_parent is not None:
            if new_parent.id == node.id:
                raise ValueError('Node cannot be parent of itself')
            if new_parent.path == old_prefix or new_parent.path.startswith(f'{old_prefix}.'):
                raise ValueError('Moving to this parent would create a cycle')

        new_path = cls.compute_node_path(new_parent)
        cls.validate_max_depth(new_parent, max_depth)

        new_prefix = f'{new_path}.{node.id}' if new_path else str(node.id)

        old_depth = cls._depth_for_path(old_path)
        new_depth = cls._depth_for_path(new_path)
        depth_delta = new_depth - old_depth

        descendants = list(
            CourseNode.objects.filter(course_id=node.course_id)
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
                CourseNode.objects.bulk_update(descendants, ['path', 'updated_at'])

            cls.bump_course_structure_version(node.course_id)

    @classmethod
    def delete_course_node_subtree(cls, course, node):
        prefix = f'{node.path}.{node.id}' if node.path else str(node.id)

        subtree = list(
            CourseNode.objects.filter(course_id=course.id)
            .filter(Q(id=node.id) | Q(path=prefix) | Q(path__startswith=f'{prefix}.'))
            .values_list('id', 'lesson_id')
        )
        if not subtree:
            return

        subtree_ids = [row[0] for row in subtree]
        lesson_ids = sorted({row[1] for row in subtree if row[1] is not None})

        with transaction.atomic():
            if lesson_ids:
                Lesson.objects.filter(id__in=lesson_ids).delete()

            CourseNode.objects.filter(id__in=subtree_ids).delete()
            cls.bump_course_structure_version(course.id)

    @classmethod
    def reorder_course_node_siblings(cls, course, parent_id, ordered_ids, actor=None):
        """Reindex ``position`` for the siblings under ``parent_id`` to 0..n.

        ``ordered_ids`` must be exactly the set of sibling ids (same course, same
        parent). The new ``position`` of each node equals its index in the list,
        so the caller (drag-and-drop UI, already folder-first) fully controls the
        order without ever producing duplicate positions.
        """
        sibling_qs = CourseNode.objects.filter(course_id=course.id, parent_id=parent_id)
        sibling_ids = set(sibling_qs.values_list('id', flat=True))

        if set(ordered_ids) != sibling_ids:
            raise ValueError('ordered_ids must match exactly the siblings of the given parent')

        nodes_by_id = {node.id: node for node in sibling_qs}
        now = timezone.now()
        to_update = []
        for index, node_id in enumerate(ordered_ids):
            node = nodes_by_id[node_id]
            if node.position != index:
                node.position = index
                node.updated_at = now
                to_update.append(node)

        with transaction.atomic():
            if to_update:
                CourseNode.objects.bulk_update(to_update, ['position', 'updated_at'])
            cls.bump_course_structure_version(course.id)

    @staticmethod
    def build_course_progress_map(user, courses):
        if not user or not user.is_authenticated:
            return {}

        course_ids = [course.id for course in courses]
        if not course_ids:
            return {}

        totals = CourseNode.objects.filter(
            course_id__in=course_ids,
            is_item=True,
            lesson__isnull=False,
        ).values('course_id').annotate(total=Count('id'))

        completed = UserLessonProgress.objects.filter(
            user=user,
            completed_at__isnull=False,
            lesson__node__course_id__in=course_ids,
        ).values('lesson__node__course_id').annotate(completed=Count('lesson_id', distinct=True))

        total_map = {row['course_id']: row['total'] for row in totals}
        completed_map = {
            row['lesson__node__course_id']: row['completed']
            for row in completed
        }

        return {
            course_id: {
                'completed': completed_map.get(course_id, 0),
                'total': total_map.get(course_id, 0),
            }
            for course_id in course_ids
        }

    @staticmethod
    def build_slug_suggestions(base_slug, limit=5):
        normalized = (base_slug or '').strip().lower().strip('-')
        if not normalized:
            normalized = 'course'

        existing = set(
            Course.objects.filter(slug__startswith=normalized).values_list('slug', flat=True)
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
    def upsert_course_tags(course, tag_ids):
        tag_ids = sorted(set(tag_ids or []))

        existing_mappings = {
            mapping.tag_id: mapping
            for mapping in CourseTagMap.objects.filter(course=course)
        }

        keep_ids = set(tag_ids)
        stale_ids = [tag_id for tag_id in existing_mappings if tag_id not in keep_ids]
        if stale_ids:
            CourseTagMap.objects.filter(course=course, tag_id__in=stale_ids).delete()

        missing_ids = [tag_id for tag_id in tag_ids if tag_id not in existing_mappings]
        if missing_ids:
            CourseTagMap.objects.bulk_create(
                [CourseTagMap(course=course, tag_id=tag_id) for tag_id in missing_ids]
            )

    @classmethod
    def archive_or_purge_course(cls, course, actor, mode='archive'):
        normalized_mode = (mode or 'archive').strip().lower()
        if normalized_mode not in {'archive', 'purge'}:
            raise ValueError('mode must be archive or purge')

        if normalized_mode == 'archive':
            if course.status != Course.Status.ARCHIVED:
                course.status = Course.Status.ARCHIVED
                course.save(update_fields=['status', 'updated_at'])
            return 'archived'

        if not actor or not actor.is_authenticated or not actor.has_permission(PERM_MATERIAL_PURGE):
            raise PermissionError('Only users with material.purge permission can purge a course')

        course.delete()
        return 'purged'

    @staticmethod
    def get_or_create_progress(user, course):
        return UserCourseProgress.objects.get_or_create(user=user, course=course)

    @classmethod
    def enroll_user(cls, user, course):
        progress, created = cls.get_or_create_progress(user, course)
        if created:
            progress.started_at = timezone.now()
            progress.save(update_fields=['started_at', 'updated_at'])
        return progress, created