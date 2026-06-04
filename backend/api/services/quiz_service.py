from django.db import transaction
from django.db.models import Max, Q
from django.db.models.functions import Lower
from django.shortcuts import get_object_or_404
from django.utils import timezone

from django.db.models import Sum

from api.models import (
    Quiz,
    QuizConfig,
    QuizNode,
    QuizQuestion,
    QuizTagMap,
    UserProfile,
    UserQuizAnswer,
    UserQuizProgress,
)
from api.utils import get_config
from auth_app.constants import PERM_MATERIAL_READ_ARCHIVE, PERM_MATERIAL_READ_DRAFT


class QuizService:
    """Domain operations for quiz view flows."""

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
        allowed = {Quiz.Status.PUBLISHED}
        if cls._can_read_draft(user):
            allowed.add(Quiz.Status.DRAFT)
        if cls._can_read_archive(user):
            allowed.add(Quiz.Status.ARCHIVED)
        return allowed

    @classmethod
    def filter_visible_quizzes(cls, queryset, user, status_param):
        allowed = cls._allowed_statuses(user)
        if status_param:
            if status_param in allowed:
                return queryset.filter(status=status_param)
            return queryset.none()
        return queryset.filter(status__in=allowed)

    @classmethod
    def filter_visible_quizzes_flat(cls, queryset, user, query_params):
        """Flat-search filter for the catalog list (mirrors challenge flat-search).

        Honours ``status``, ``search`` (title icontains), ``category``, ``tags``
        (AND-join), and ``solved`` (relative to the requesting user).
        """
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

        # Tag AND-filter: ``?tags=1,2,3`` keeps only quizzes carrying *all* of
        # the requested tags (each id adds its own join so they AND together).
        tag_ids = cls._parse_tag_ids(query_params.get('tags'))
        for tag_id in tag_ids:
            queryset = queryset.filter(tag_mappings__tag_id=tag_id)
        if tag_ids:
            queryset = queryset.distinct()

        # Solved filter (?solved=true|false) relative to the requesting user.
        solved_param = (query_params.get('solved') or '').strip().lower()
        if solved_param in {'true', 'false'} and user and user.is_authenticated:
            solved_ids = UserQuizProgress.objects.filter(
                user=user, completed_at__isnull=False
            ).values_list('quiz_id', flat=True)
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

    @staticmethod
    def solved_quiz_ids(user, quiz_ids=None):
        """Return the set of solved quiz ids for ``user`` (optionally scoped)."""
        if not user or not user.is_authenticated:
            return set()
        qs = UserQuizProgress.objects.filter(user=user, completed_at__isnull=False)
        if quiz_ids is not None:
            ids = [qid for qid in quiz_ids if qid is not None]
            if not ids:
                return set()
            qs = qs.filter(quiz_id__in=ids)
        return set(qs.values_list('quiz_id', flat=True))

    # ------------------------------------------------------------------
    # Tree / file-explorer operations (mirror ChallengeService)
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

    @classmethod
    def create_quiz_node_atomic(cls, payload, actor):
        """Create a quiz tree node.

        ``is_item=False`` -> create a folder node only.
        ``is_item=True``  -> atomically create a draft ``Quiz`` plus the
        ``QuizNode`` pointing at it (caller navigates to the editor by id).
        """
        max_depth = int(get_config('quiz.max_tree_depth', default=5) or 5)

        parent = None
        parent_id = payload.get('parent_id', None)
        if parent_id is not None:
            parent = QuizNode.objects.get(id=parent_id)
            if parent.is_item:
                raise ValueError('Parent must be a folder node')

        cls.validate_max_depth(parent, max_depth)

        title = (payload.get('title') or '').strip()
        if not title:
            raise ValueError('title is required')

        # End-of-list position keeps the column meaningful for forward-compat even
        # though quiz ordering is title-based (no manual reorder).
        max_position = (
            QuizNode.objects.filter(parent_id=parent_id)
            .aggregate(max_position=Max('position'))
            .get('max_position')
        )
        position = 0 if max_position is None else max_position + 1

        is_item = bool(payload.get('is_item'))
        now = timezone.now()

        with transaction.atomic():
            quiz = None
            if is_item:
                quiz = Quiz.objects.create(
                    title=title,
                    status=Quiz.Status.DRAFT,
                    quiz_point=0,
                    total_questions=0,
                    created_by=actor,
                    updated_by=actor,
                )

            node = QuizNode.objects.create(
                parent=parent,
                is_item=is_item,
                title=title,
                position=position,
                quiz=quiz,
                path=cls.compute_node_path(parent),
                created_by=actor,
                updated_by=actor,
                created_at=now,
                updated_at=now,
            )

        return node

    @classmethod
    def move_quiz_node_bulk(cls, node, new_parent):
        """Move ``node`` under ``new_parent`` and bulk-update descendant paths.

        Mirrors ``ChallengeService.move_challenge_node_bulk`` to avoid the
        per-node ``BaseNode.rebuild_path`` N+1 saves. The quiz tree is global, so
        there is no scoping or structure-version bump.
        """
        max_depth = int(get_config('quiz.max_tree_depth', default=5) or 5)

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
            QuizNode.objects
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
                QuizNode.objects.bulk_update(descendants, ['path', 'updated_at'])

    @classmethod
    def list_explorer_children(cls, parent, user):
        """Folders + visible quiz items directly under ``parent`` (root if None).

        Folders sort before items; both sorted by case-insensitive title. Item
        visibility follows the requesting user's allowed statuses (members get
        published-only).
        """
        qs = (
            QuizNode.objects.filter(parent=parent)
            .select_related('quiz', 'quiz__category')
            .prefetch_related('quiz__tag_mappings__tag')
            .order_by('is_item', Lower('title'), 'id')
        )
        allowed = cls._allowed_statuses(user)
        visible = []
        for node in qs:
            if node.is_item:
                if node.quiz is None or node.quiz.status not in allowed:
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
            ancestors = {n.id: n for n in QuizNode.objects.filter(id__in=ancestor_ids)}
            for aid in ancestor_ids:
                node = ancestors.get(aid)
                if node is not None:
                    crumbs.append({'id': node.id, 'title': node.title})
        crumbs.append({'id': parent.id, 'title': parent.title})
        return crumbs

    @staticmethod
    def upsert_quiz_tags(quiz, tag_ids):
        tag_ids = sorted(set(tag_ids or []))

        existing_mappings = {
            mapping.tag_id: mapping
            for mapping in QuizTagMap.objects.filter(quiz=quiz)
        }

        keep_ids = set(tag_ids)
        stale_ids = [tag_id for tag_id in existing_mappings if tag_id not in keep_ids]
        if stale_ids:
            QuizTagMap.objects.filter(quiz=quiz, tag_id__in=stale_ids).delete()

        missing_ids = [tag_id for tag_id in tag_ids if tag_id not in existing_mappings]
        if missing_ids:
            QuizTagMap.objects.bulk_create(
                [QuizTagMap(quiz=quiz, tag_id=tag_id) for tag_id in missing_ids]
            )

    # ------------------------------------------------------------------
    # Question / config / progress helpers (existing)
    # ------------------------------------------------------------------

    @staticmethod
    def get_quiz_question(quiz, qid):
        return get_object_or_404(QuizQuestion, id=qid, quiz=quiz)

    @staticmethod
    def sync_total_questions(quiz):
        total = quiz.questions.count()
        if quiz.total_questions != total:
            quiz.total_questions = total
            quiz.save(update_fields=['total_questions', 'updated_at'])

    @staticmethod
    def sync_quiz_point(quiz):
        """Derive ``quiz.quiz_point`` as the sum of its question scores.

        ``quiz_point`` is no longer authored by hand — it is the maximum score
        achievable on the quiz and is kept in sync whenever questions change
        (via the ``QuizQuestion`` post_save/post_delete signal).
        """
        total = quiz.questions.aggregate(total=Sum('score')).get('total') or 0
        if quiz.quiz_point != total:
            quiz.quiz_point = total
            quiz.save(update_fields=['quiz_point', 'updated_at'])

    @staticmethod
    def solved_question_ids(quiz, user):
        """Set of question ids the user has EVER answered correctly for this quiz.

        Scans every attempt (``UserQuizAnswer.score_obtained > 0``). Used both for
        the cumulative point model (no double-count) and the ``question_filter``
        config (unsolved/solved review modes).
        """
        if not user or not getattr(user, 'is_authenticated', False):
            return set()
        return set(
            UserQuizAnswer.objects.filter(
                attempt__quiz=quiz,
                attempt__user=user,
                score_obtained__gt=0,
            ).values_list('question_id', flat=True)
        )

    @classmethod
    def earned_quiz_point(cls, quiz, user):
        """Sum of current scores of questions the user has ever answered correctly.

        Each correct question counts once at its current ``score`` — re-solving an
        already-correct question adds nothing; a later wrong answer never subtracts.
        """
        solved_ids = cls.solved_question_ids(quiz, user)
        if not solved_ids:
            return 0
        return (
            QuizQuestion.objects.filter(quiz=quiz, id__in=solved_ids)
            .aggregate(total=Sum('score'))
            .get('total')
            or 0
        )

    @classmethod
    def is_quiz_completed(cls, quiz, user):
        """True when the user has ever answered EVERY current question correctly.

        Completion = 100% of the quiz's questions solved (max score). An empty
        quiz (no questions) is never considered completed.
        """
        total_questions = quiz.questions.count()
        if total_questions == 0:
            return False
        return len(cls.solved_question_ids(quiz, user)) >= total_questions

    @classmethod
    def recompute_user_quiz_points(cls, user):
        """Recompute and persist a user's cumulative quiz point + completion count.

        Cách A (no extra table): the profile's ``total_quiz_point`` and
        ``quiz_completed`` are derived absolutely from the user's
        historically-correct answers across every quiz they touched. Setting
        absolute values (not ``F() +=``) makes this naturally idempotent and
        double-count-free — re-finishing an attempt or re-solving a question can
        never inflate the total.

        Returns ``(total_quiz_point, quiz_completed)``.
        """
        quiz_ids = (
            UserQuizAnswer.objects.filter(attempt__user=user, score_obtained__gt=0)
            .values_list('attempt__quiz_id', flat=True)
            .distinct()
        )

        total_point = 0
        completed_count = 0
        for quiz in Quiz.objects.filter(id__in=list(quiz_ids)):
            total_point += cls.earned_quiz_point(quiz, user)
            if cls.is_quiz_completed(quiz, user):
                completed_count += 1

        profile, _ = UserProfile.objects.get_or_create(user=user)
        UserProfile.objects.filter(pk=profile.pk).update(
            total_quiz_point=total_point,
            quiz_completed=completed_count,
        )
        return total_point, completed_count

    @staticmethod
    def get_or_create_user_config(quiz, user):
        return QuizConfig.objects.get_or_create(
            quiz=quiz,
            user=user,
            defaults={
                'total_questions': None,
                'time_limit_sec': None,
                'random_question': False,
                'random_option': False,
                'question_filter': QuizConfig.QuestionFilter.ALL,
                'immediate_feedback': True,
                'allow_review': True,
                'allow_retry': True,
                'max_attempt': None,
                'is_active': True,
            },
        )

    @staticmethod
    def build_default_progress_payload(quiz_id, user_id):
        return {
            'id': None,
            'user_id': user_id,
            'quiz_id': quiz_id,
            'best_score': 0,
            'attempt_count': 0,
            'first_attempted_at': None,
            'last_attempted_at': None,
        }

    @staticmethod
    def get_user_progress(quiz, user):
        try:
            return UserQuizProgress.objects.get(quiz=quiz, user=user)
        except UserQuizProgress.DoesNotExist:
            return None
