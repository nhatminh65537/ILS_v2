from django.db import IntegrityError, transaction
from django.db.models import Max
from django.utils import timezone

from api.models import Course, CourseNode, Lesson, LessonOutline, LessonQuestion, QuizQuestion
from api.services.outline_service import OutlineService
from auth_app.constants import PERM_MATERIAL_READ_ARCHIVE, PERM_MATERIAL_READ_DRAFT


class LessonService:
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
    def get_visible_lesson_by_id(cls, lesson_id: int, user) -> Lesson:
        lesson = Lesson.objects.select_related('node__course').get(id=lesson_id)

        try:
            node = lesson.node
        except CourseNode.DoesNotExist as exc:
            raise Lesson.DoesNotExist('Lesson is not attached to a course node.') from exc

        course = node.course

        if course.status == Course.Status.PUBLISHED:
            return lesson
        if course.status == Course.Status.DRAFT and cls._can_read_draft(user):
            return lesson
        if course.status == Course.Status.ARCHIVED and cls._can_read_archive(user):
            return lesson

        raise Lesson.DoesNotExist('Lesson not visible.')

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

    # ── Outline integration (Task 5.8) ───────────────────────────────────────
    @staticmethod
    def get_outline_info(lesson: Lesson):
        """Return the LessonOutline record for ``lesson`` or None."""
        return LessonOutline.objects.filter(lesson=lesson).first()

    @classmethod
    def link_outline(cls, *, lesson: Lesson, outline_doc_id: str, actor) -> LessonOutline:
        """Link a lesson to an Outline document and import its markdown.

        Fetches the document first (so an Outline failure aborts before any DB
        write), then atomically upserts the LessonOutline record and overwrites
        ``lesson.content_md`` / sets ``lesson.source = outline``.

        Raises:
            ValueError: the doc is already linked to a different lesson (-> 409).
            OutlineConfigError / OutlineUnavailableError / OutlineNotFoundError:
                propagated from OutlineService (mapped to HTTP by the caller).
        """
        doc_id = (outline_doc_id or '').strip()
        if not doc_id:
            raise ValueError('outline_doc_id is required.')

        # The doc must not already be linked to a *different* lesson
        # (outline_doc_id is unique).
        existing = LessonOutline.objects.filter(outline_doc_id=doc_id).first()
        if existing is not None and existing.lesson_id != lesson.id:
            raise ValueError('This Outline document is already linked to another lesson.')

        document = OutlineService.get_document(doc_id)
        now = timezone.now()

        with transaction.atomic():
            outline_info, created = LessonOutline.objects.update_or_create(
                lesson=lesson,
                defaults={
                    'outline_doc_id': doc_id,
                    'outline_url': document['url'],
                    'revision': document.get('revision'),
                    'last_synced_at': now,
                    'updated_by': actor,
                    'updated_at': now,
                },
            )
            if created:
                outline_info.created_by = actor
                outline_info.created_at = now
                outline_info.save(update_fields=['created_by', 'created_at'])

            # Rewrite Outline attachment (image) URLs to the ILS proxy so images
            # render in the browser without leaking the Outline token.
            lesson.content_md = OutlineService.rewrite_attachment_urls(
                document['text'], lesson.id
            )
            lesson.source = Lesson.Source.OUTLINE
            lesson.updated_by = actor
            lesson.updated_at = now
            lesson.save(update_fields=['content_md', 'source', 'updated_by', 'updated_at'])

        return outline_info

    @classmethod
    def sync_outline(cls, *, lesson: Lesson, actor) -> LessonOutline:
        """Re-pull content from the linked Outline document.

        On Outline failure the exception propagates and no DB write happens, so
        the previous ``content_md`` stays intact (caller maps to HTTP 503).

        Raises:
            ValueError: lesson is not linked to Outline (-> 400).
        """
        outline_info = cls.get_outline_info(lesson)
        if outline_info is None:
            raise ValueError('Lesson is not linked to Outline.')

        document = OutlineService.get_document(outline_info.outline_doc_id)
        now = timezone.now()

        with transaction.atomic():
            outline_info.outline_url = document['url']
            outline_info.revision = document.get('revision')
            outline_info.last_synced_at = now
            outline_info.updated_by = actor
            outline_info.updated_at = now
            outline_info.save(
                update_fields=['outline_url', 'revision', 'last_synced_at', 'updated_by', 'updated_at']
            )

            # Same attachment-URL rewrite as import so re-synced content keeps
            # working images through the ILS proxy.
            lesson.content_md = OutlineService.rewrite_attachment_urls(
                document['text'], lesson.id
            )
            lesson.source = Lesson.Source.OUTLINE
            lesson.updated_by = actor
            lesson.updated_at = now
            lesson.save(update_fields=['content_md', 'source', 'updated_by', 'updated_at'])

        return outline_info

    @classmethod
    def unlink_outline(cls, *, lesson: Lesson, actor) -> None:
        """Detach the lesson from Outline. Keeps ``content_md`` but resets source.

        Raises:
            ValueError: lesson is not linked to Outline (-> 400).
        """
        outline_info = cls.get_outline_info(lesson)
        if outline_info is None:
            raise ValueError('Lesson is not linked to Outline.')

        now = timezone.now()
        with transaction.atomic():
            outline_info.delete()
            lesson.source = Lesson.Source.MANUAL
            lesson.updated_by = actor
            lesson.updated_at = now
            lesson.save(update_fields=['source', 'updated_by', 'updated_at'])
