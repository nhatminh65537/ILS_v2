from django.db import IntegrityError
from django.db.models import Max
from django.utils import timezone

from api.models import Course, CourseNode, Lesson, LessonQuestion, QuizQuestion


class LessonService:
    @staticmethod
    def is_editor_or_admin(user) -> bool:
        if not user or not user.is_authenticated:
            return False
        if getattr(user, 'is_superuser', False):
            return True
        return user.user_roles.filter(role__name__in=['Admin', 'Editor']).exists()

    @classmethod
    def get_visible_lesson_by_id(cls, lesson_id: int, user) -> Lesson:
        lesson = Lesson.objects.select_related('node__course').get(id=lesson_id)

        try:
            node = lesson.node
        except CourseNode.DoesNotExist as exc:
            raise Lesson.DoesNotExist('Lesson is not attached to a course node.') from exc

        course = node.course

        if not cls.is_editor_or_admin(user) and course.status != Course.Status.PUBLISHED:
            raise Lesson.DoesNotExist('Lesson not visible.')

        return lesson

    @staticmethod
    def require_miniquiz(lesson: Lesson) -> None:
        if lesson.lesson_type != Lesson.LessonType.MINIQUIZ:
            raise ValueError('Lesson is not a miniquiz.')

    @staticmethod
    def list_lesson_questions(lesson: Lesson):
        return (
            LessonQuestion.objects.filter(lesson=lesson)
            .select_related('question')
            .prefetch_related('question__options', 'question__answers')
            .order_by('position', 'id')
        )

    @classmethod
    def attach_question(
        cls,
        *,
        lesson: Lesson,
        question_id: int,
        position: int | None,
        actor,
    ) -> LessonQuestion:
        question = QuizQuestion.objects.get(id=question_id)

        if position is None:
            max_pos = (
                LessonQuestion.objects.filter(lesson=lesson).aggregate(Max('position')).get('position__max')
            )
            position = int(max_pos or 0)
            if LessonQuestion.objects.filter(lesson=lesson).exists():
                position += 1

        now = timezone.now()

        try:
            mapping = LessonQuestion.objects.create(
                lesson=lesson,
                question=question,
                position=position,
                created_by=actor,
                updated_by=actor,
                created_at=now,
                updated_at=now,
            )
        except IntegrityError as exc:
            raise ValueError('Question already attached to lesson.') from exc

        return mapping

    @staticmethod
    def update_mapping_position(*, mapping: LessonQuestion, position: int, actor) -> LessonQuestion:
        mapping.position = position
        mapping.updated_by = actor
        mapping.updated_at = timezone.now()
        mapping.save(update_fields=['position', 'updated_by', 'updated_at'])
        return mapping

    @staticmethod
    def delete_mapping(*, mapping: LessonQuestion) -> None:
        mapping.delete()
