from decimal import Decimal, ROUND_HALF_UP

from django.db.models import F
from django.utils import timezone

from api.models import Course, CourseNode, Lesson, UserCourseProgress, UserLessonProgress, UserProfile


class LearnProgressService:
    """Domain operations for learn lesson/course progress flows."""

    @staticmethod
    def _resolve_course_for_lesson(lesson: Lesson) -> Course:
        try:
            node = lesson.node
        except CourseNode.DoesNotExist as exc:
            raise ValueError('Lesson is not attached to a course node.') from exc
        return node.course

    @staticmethod
    def _compute_percent(completed_count: int, lesson_count: int) -> Decimal:
        if lesson_count <= 0:
            return Decimal('0.00')
        raw = (Decimal(completed_count) * Decimal('100')) / Decimal(lesson_count)
        return raw.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    @classmethod
    def _build_course_progress_payload(cls, progress: UserCourseProgress) -> dict:
        return {
            'lesson_count': int(progress.total_lessons_cache or 0),
            'completed': int(progress.completed_lessons_cache or 0),
            'percent': progress.progress_percent_cache,
        }

    @classmethod
    def get_or_create_course_progress(cls, user, course: Course, actor=None) -> UserCourseProgress:
        now = timezone.now()
        progress, created = UserCourseProgress.objects.get_or_create(
            user=user,
            course=course,
            defaults={
                'started_at': now,
                'created_by': actor,
                'updated_by': actor,
            },
        )

        if created:
            return progress

        if progress.started_at is None:
            progress.started_at = now
            update_fields = ['started_at', 'updated_at']
            if actor is not None:
                progress.updated_by = actor
                update_fields.append('updated_by')
            progress.save(update_fields=update_fields)

        return progress

    @classmethod
    def start_lesson(cls, user, lesson: Lesson, actor=None) -> UserLessonProgress:
        now = timezone.now()
        lesson_progress, created = UserLessonProgress.objects.get_or_create(
            user=user,
            lesson=lesson,
            defaults={
                'started_at': now,
                'created_by': actor,
                'updated_by': actor,
            },
        )

        if not created and lesson_progress.started_at is None:
            lesson_progress.started_at = now
            update_fields = ['started_at', 'updated_at']
            if actor is not None:
                lesson_progress.updated_by = actor
                update_fields.append('updated_by')
            lesson_progress.save(update_fields=update_fields)

        course = cls._resolve_course_for_lesson(lesson)
        cls.get_or_create_course_progress(user=user, course=course, actor=actor)
        return lesson_progress

    @classmethod
    def complete_lesson(cls, user, lesson: Lesson, actor=None):
        now = timezone.now()
        lesson_progress, created = UserLessonProgress.objects.get_or_create(
            user=user,
            lesson=lesson,
            defaults={
                'started_at': now,
                'completed_at': now,
                'created_by': actor,
                'updated_by': actor,
            },
        )

        transitioned = False

        if created:
            transitioned = True
        else:
            update_fields = []

            if lesson_progress.started_at is None:
                lesson_progress.started_at = now
                update_fields.append('started_at')

            if lesson_progress.completed_at is None:
                lesson_progress.completed_at = now
                update_fields.append('completed_at')
                transitioned = True

            if update_fields:
                update_fields.append('updated_at')
                if actor is not None:
                    lesson_progress.updated_by = actor
                    update_fields.append('updated_by')
                lesson_progress.save(update_fields=update_fields)

        course = cls._resolve_course_for_lesson(lesson)
        cls.get_or_create_course_progress(user=user, course=course, actor=actor)

        if transitioned:
            cls.award_lesson_points(user=user, lesson=lesson)

        return lesson_progress, transitioned

    @classmethod
    def recompute_course_progress(
        cls,
        user,
        course: Course,
        course_progress: UserCourseProgress | None = None,
        return_transition: bool = False,
    ) -> dict:
        course_progress = course_progress or cls.get_or_create_course_progress(user=user, course=course, actor=None)
        previous_completed_at = course_progress.completed_at

        lesson_count = CourseNode.objects.filter(
            course_id=course.id,
            is_item=True,
            lesson__isnull=False,
        ).count()

        completed_count = UserLessonProgress.objects.filter(
            user=user,
            completed_at__isnull=False,
            lesson__node__course_id=course.id,
        ).count()

        percent = cls._compute_percent(completed_count=completed_count, lesson_count=lesson_count)

        update_fields = []
        if course_progress.total_lessons_cache != lesson_count:
            course_progress.total_lessons_cache = lesson_count
            update_fields.append('total_lessons_cache')

        if course_progress.completed_lessons_cache != completed_count:
            course_progress.completed_lessons_cache = completed_count
            update_fields.append('completed_lessons_cache')

        if course_progress.progress_percent_cache != percent:
            course_progress.progress_percent_cache = percent
            update_fields.append('progress_percent_cache')

        if course_progress.last_computed_version != course.structure_version:
            course_progress.last_computed_version = course.structure_version
            update_fields.append('last_computed_version')

        if lesson_count > 0 and completed_count >= lesson_count and course_progress.completed_at is None:
            course_progress.completed_at = timezone.now()
            update_fields.append('completed_at')

        if update_fields:
            update_fields.append('updated_at')
            course_progress.save(update_fields=update_fields)

        cls.sync_user_profile_on_course_completion(
            user=user,
            course=course,
            previous_completed_at=previous_completed_at,
            new_completed_at=course_progress.completed_at,
        )

        payload = cls._build_course_progress_payload(course_progress)
        transitioned_to_completion = previous_completed_at is None and course_progress.completed_at is not None

        if return_transition:
            return payload, transitioned_to_completion

        return payload

    @classmethod
    def recompute_course_progress_if_stale(cls, user, course: Course) -> dict:
        course_progress = cls.get_or_create_course_progress(user=user, course=course, actor=None)
        if course_progress.last_computed_version != course.structure_version:
            return cls.recompute_course_progress(user=user, course=course, course_progress=course_progress)
        return cls._build_course_progress_payload(course_progress)

    @staticmethod
    def award_lesson_points(user, lesson: Lesson) -> None:
        """Award a lesson's learning_point to the user's total exactly once.

        Called only on the first completion transition of a lesson, so the
        increment is idempotent across repeated complete calls.
        """
        points = int(lesson.learning_point or 0)
        if points <= 0:
            return

        profile, _ = UserProfile.objects.get_or_create(user=user)
        UserProfile.objects.filter(pk=profile.pk).update(
            total_learning_point=F('total_learning_point') + points,
        )

    @staticmethod
    def sync_user_profile_on_course_completion(user, course: Course, previous_completed_at, new_completed_at) -> None:
        if previous_completed_at is not None or new_completed_at is None:
            return

        # Points are awarded per-lesson on completion; course completion only
        # bumps the completed-course counter to avoid double-counting points.
        profile, _ = UserProfile.objects.get_or_create(user=user)
        UserProfile.objects.filter(pk=profile.pk).update(
            course_completed=F('course_completed') + 1,
        )
