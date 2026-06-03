from django.db import IntegrityError, transaction
from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from auth_app.constants import BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER
from auth_app.permissions import HasJWTPermission, add_role_granted

from api.models import Course, CourseCategory, CourseNode, CourseTag, Lesson, LessonQuestion, QuizQuestion
from api.serializers import (
    LearnCourseProgressSerializer,
    CourseDetailSerializer,
    CourseListSerializer,
    CourseNodeSerializer,
    CourseCategorySerializer,
    CourseTagSerializer,
    LearnCourseNodeReorderSerializer,
    LearnCourseNodeSerializer,
    LearnCourseNodeUpdateSerializer,
    LearnCourseNodeWriteSerializer,
    LearnCourseDetailSerializer,
    LearnCourseListSerializer,
    LearnCourseWriteSerializer,
    LearnLessonDetailSerializer,
    LearnLessonQuestionAttachSerializer,
    LearnLessonQuestionSerializer,
    LearnLessonQuestionUpdateSerializer,
    LearnLessonUpdateSerializer,
    LessonSerializer,
    UserCourseProgressSerializer,
    UserLessonProgressSerializer,
)
from api.services.course_service import CourseService
from api.services.learn_progress_service import LearnProgressService
from api.services.lesson_service import LessonService


@add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
class CourseViewSet(viewsets.ModelViewSet):
    """Course management viewset."""

    permission_classes = [IsAuthenticated, HasJWTPermission]

    def get_queryset(self):
        queryset = Course.objects.all()
        return CourseService.filter_visible_courses(queryset, self.request.user, self.request.query_params)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CourseDetailSerializer
        return CourseListSerializer

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    @action(detail=True, methods=['get'])
    def tree(self, request, pk=None):
        course = self.get_object()
        nodes = CourseService.get_course_tree_nodes(course)
        serializer = CourseNodeSerializer(nodes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        course = self.get_object()
        progress, _ = CourseService.get_or_create_progress(request.user, course)
        serializer = UserCourseProgressSerializer(progress)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def enroll(self, request, pk=None):
        course = self.get_object()
        CourseService.enroll_user(request.user, course)
        return Response({'message': 'Enrolled successfully'})


@add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
class LessonViewSet(viewsets.ReadOnlyModelViewSet):
    """Lesson viewset (read-only for users)."""

    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        lesson = self.get_object()
        lesson.mark_completed(request.user)
        return Response({'message': 'Lesson marked as completed'})

    @action(detail=True, methods=['get'])
    def render(self, request, pk=None):
        lesson = self.get_object()
        rendered = lesson.render()
        return Response({'content': rendered})


@add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
class LearnCourseViewSet(viewsets.ModelViewSet):
    """Canonical namespaced course CRUD API under /api/learn/courses/."""

    queryset = Course.objects.all().select_related('category').prefetch_related('tag_mappings__tag')
    permission_classes = [IsAuthenticated, HasJWTPermission]
    # Use limit/offset paging so the frontend catalog + admin list (which send
    # ``limit``/``offset``) drive backend pagination directly.
    pagination_class = LimitOffsetPagination
    lookup_field = 'slug'
    lookup_url_kwarg = 'slug'

    def get_queryset(self):
        queryset = super().get_queryset()
        return CourseService.filter_visible_learn_courses(queryset, self.request.user, self.request.query_params)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return LearnCourseDetailSerializer
        if self.action in {'create', 'update', 'partial_update'}:
            return LearnCourseWriteSerializer
        return LearnCourseListSerializer

    def _build_slug_conflict_response(self, slug):
        suggestions = CourseService.build_slug_suggestions(slug)
        return Response(
            {
                'detail': 'Slug already exists.',
                'slug': slug,
                'suggestions': suggestions,
            },
            status=status.HTTP_409_CONFLICT,
        )

    @staticmethod
    def _normalize_slug(payload):
        raw = payload.get('slug')
        if raw is None:
            return None
        return str(raw).strip().lower()

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def create(self, request, *args, **kwargs):
        requested_slug = self._normalize_slug(request.data)
        if requested_slug and Course.objects.filter(slug=requested_slug).exists():
            return self._build_slug_conflict_response(requested_slug)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            course = serializer.save()
        except IntegrityError:
            fallback_slug = requested_slug or serializer.validated_data.get('slug')
            if fallback_slug and Course.objects.filter(slug=fallback_slug).exists():
                return self._build_slug_conflict_response(fallback_slug)
            raise ValidationError({'detail': 'Invalid payload.'})

        detail_serializer = LearnCourseDetailSerializer(
            course,
            context={
                'request': request,
                'progress_map': CourseService.build_course_progress_map(request.user, [course]),
            },
        )
        return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        requested_slug = self._normalize_slug(request.data)
        if requested_slug and requested_slug != instance.slug and Course.objects.filter(slug=requested_slug).exists():
            return self._build_slug_conflict_response(requested_slug)

        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        course = serializer.save()

        detail_serializer = LearnCourseDetailSerializer(
            course,
            context={
                'request': request,
                'progress_map': CourseService.build_course_progress_map(request.user, [course]),
            },
        )
        return Response(detail_serializer.data)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def destroy(self, request, *args, **kwargs):
        course = self.get_object()
        mode = request.query_params.get('mode', 'archive')

        try:
            CourseService.archive_or_purge_course(course, request.user, mode=mode)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except PermissionError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_403_FORBIDDEN)

        return Response(status=status.HTTP_204_NO_CONTENT)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        if page is not None:
            progress_map = CourseService.build_course_progress_map(request.user, page)
            serializer = self.get_serializer(page, many=True, context={'request': request, 'progress_map': progress_map})
            return self.get_paginated_response(serializer.data)

        progress_map = CourseService.build_course_progress_map(request.user, queryset)
        serializer = self.get_serializer(queryset, many=True, context={'request': request, 'progress_map': progress_map})
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        course = self.get_object()
        serializer = LearnCourseDetailSerializer(
            course,
            context={
                'request': request,
                'progress_map': CourseService.build_course_progress_map(request.user, [course]),
            },
        )
        return Response(serializer.data)

    def progress(self, request, slug=None):
        course = self.get_object()
        payload = LearnProgressService.recompute_course_progress_if_stale(
            user=request.user,
            course=course,
        )
        serializer = LearnCourseProgressSerializer(payload)
        return Response(serializer.data)


@add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
class LearnCourseCategoryViewSet(viewsets.ModelViewSet):
    """Canonical namespaced category CRUD API under /api/learn/categories/."""

    queryset = CourseCategory.objects.all().order_by('name')
    serializer_class = CourseCategorySerializer
    permission_classes = [IsAuthenticated, HasJWTPermission]

    @add_role_granted(BUILTIN_ROLE_ADMIN)
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @add_role_granted(BUILTIN_ROLE_ADMIN)
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @add_role_granted(BUILTIN_ROLE_ADMIN)
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @add_role_granted(BUILTIN_ROLE_ADMIN)
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)


@add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
class LearnCourseTagViewSet(viewsets.ModelViewSet):
    """Canonical namespaced tag CRUD API under /api/learn/tags/."""

    queryset = CourseTag.objects.all().order_by('name')
    serializer_class = CourseTagSerializer
    permission_classes = [IsAuthenticated, HasJWTPermission]

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)


@add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
class LearnCourseNodeViewSet(viewsets.ViewSet):
    """Canonical learn course node tree API under /api/learn/courses/{slug}/nodes/*."""

    permission_classes = [IsAuthenticated, HasJWTPermission]

    def _get_course(self, slug, user):
        try:
            return CourseService.get_visible_course_by_slug(slug, user)
        except Course.DoesNotExist as exc:
            raise NotFound('Course not found') from exc

    def _get_node(self, course, node_id):
        try:
            return CourseService.get_course_node_or_404(course, node_id)
        except CourseNode.DoesNotExist as exc:
            raise NotFound('Node not found') from exc

    def list(self, request, slug=None):
        course = self._get_course(slug, request.user)
        nodes = (
            CourseNode.objects.filter(course_id=course.id, parent__isnull=True)
            .select_related('lesson')
            .annotate(children_count=Count('children'))
            .order_by('is_item', 'position', 'id')
        )
        serializer = LearnCourseNodeSerializer(nodes, many=True, context={'request': request})
        return Response(serializer.data)

    def children(self, request, slug=None, pk=None):
        course = self._get_course(slug, request.user)
        node = self._get_node(course, pk)

        if node.is_item:
            return Response([])

        children = (
            CourseNode.objects.filter(course_id=course.id, parent_id=node.id)
            .select_related('lesson')
            .annotate(children_count=Count('children'))
            .order_by('is_item', 'position', 'id')
        )
        serializer = LearnCourseNodeSerializer(children, many=True, context={'request': request})
        return Response(serializer.data)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def create(self, request, slug=None):
        course = self._get_course(slug, request.user)
        serializer = LearnCourseNodeWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            node = CourseService.create_course_node_atomic(course, serializer.validated_data, request.user)
        except CourseNode.DoesNotExist:
            raise ValidationError({'parent_id': 'Invalid parent_id'})
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        response_serializer = LearnCourseNodeSerializer(node, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def update(self, request, slug=None, pk=None):
        course = self._get_course(slug, request.user)
        node = self._get_node(course, pk)

        serializer = LearnCourseNodeUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        moved = False
        if 'parent_id' in payload and payload['parent_id'] != node.parent_id:
            parent_id = payload['parent_id']
            new_parent = None
            if parent_id is not None:
                try:
                    new_parent = CourseNode.objects.get(course_id=course.id, id=parent_id)
                except CourseNode.DoesNotExist:
                    raise ValidationError({'parent_id': 'Invalid parent_id'})

            try:
                CourseService.move_course_node_bulk(node, new_parent)
            except ValueError as exc:
                return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            moved = True

        updated_fields = []
        title_changed = False
        if 'title' in payload:
            node.title = payload['title']
            updated_fields.append('title')
            title_changed = True
        if 'position' in payload:
            node.position = payload['position']
            updated_fields.append('position')

        if updated_fields:
            with transaction.atomic():
                node.save(update_fields=updated_fields + ['updated_at'])
                # Keep lesson.title in sync with the node title for item nodes so
                # the single shared "title" field stays consistent across renames.
                if title_changed and node.is_item and node.lesson_id:
                    Lesson.objects.filter(id=node.lesson_id).update(title=node.title)
                if not moved:
                    CourseService.bump_course_structure_version(course.id)

        response_serializer = LearnCourseNodeSerializer(node, context={'request': request})
        return Response(response_serializer.data)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def reorder(self, request, slug=None):
        course = self._get_course(slug, request.user)
        serializer = LearnCourseNodeReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        try:
            CourseService.reorder_course_node_siblings(
                course,
                payload.get('parent_id'),
                payload['ordered_ids'],
                request.user,
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def destroy(self, request, slug=None, pk=None):
        course = self._get_course(slug, request.user)
        node = self._get_node(course, pk)

        CourseService.delete_course_node_subtree(course, node)
        return Response(status=status.HTTP_204_NO_CONTENT)


@add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
class LearnLessonViewSet(viewsets.ViewSet):
    """Canonical learn lesson endpoints under /api/learn/lessons/* (Task 5.3)."""

    permission_classes = [IsAuthenticated, HasJWTPermission]

    @staticmethod
    def _get_lesson_or_404(lesson_id: int, user):
        try:
            return LessonService.get_visible_lesson_by_id(int(lesson_id), user)
        except (Lesson.DoesNotExist, ValueError) as exc:
            raise NotFound('Lesson not found') from exc

    def retrieve(self, request, pk=None):
        lesson = self._get_lesson_or_404(pk, request.user)
        return Response(LearnLessonDetailSerializer(lesson).data)

    def start_progress(self, request, pk=None):
        lesson = self._get_lesson_or_404(pk, request.user)
        progress = LearnProgressService.start_lesson(
            user=request.user,
            lesson=lesson,
            actor=request.user,
        )
        return Response(UserLessonProgressSerializer(progress).data)

    def complete_progress(self, request, pk=None):
        lesson = self._get_lesson_or_404(pk, request.user)
        progress, _transitioned = LearnProgressService.complete_lesson(
            user=request.user,
            lesson=lesson,
            actor=request.user,
        )
        return Response(UserLessonProgressSerializer(progress).data)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def update(self, request, pk=None):
        lesson = self._get_lesson_or_404(pk, request.user)
        serializer = LearnLessonUpdateSerializer(lesson, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        lesson.refresh_from_db()
        return Response(LearnLessonDetailSerializer(lesson).data)

    def questions(self, request, pk=None):
        lesson = self._get_lesson_or_404(pk, request.user)
        try:
            LessonService.require_miniquiz(lesson)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        mappings = LessonService.list_lesson_questions(lesson)
        return Response(LearnLessonQuestionSerializer(mappings, many=True).data)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def add_question(self, request, pk=None):
        lesson = self._get_lesson_or_404(pk, request.user)
        try:
            LessonService.require_miniquiz(lesson)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = LearnLessonQuestionAttachSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            mapping = LessonService.attach_question(
                lesson=lesson,
                question_id=serializer.validated_data['question_id'],
                position=serializer.validated_data.get('position'),
                actor=request.user,
            )
        except QuizQuestion.DoesNotExist:
            raise NotFound('Question not found')
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)

        return Response(LearnLessonQuestionSerializer(mapping).data, status=status.HTTP_201_CREATED)


@add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
class LearnLessonQuestionViewSet(viewsets.ViewSet):
    """Canonical lesson-question mapping endpoints under /api/learn/lesson-questions/*."""

    permission_classes = [IsAuthenticated, HasJWTPermission]

    @staticmethod
    def _get_mapping(pk: int):
        return LessonQuestion.objects.select_related('lesson__node__course', 'question').get(id=pk)

    def retrieve(self, request, pk=None):
        try:
            mapping = self._get_mapping(int(pk))
            LessonService.get_visible_lesson_by_id(mapping.lesson_id, request.user)
        except (LessonQuestion.DoesNotExist, Lesson.DoesNotExist, ValueError) as exc:
            raise NotFound('Lesson question not found') from exc

        return Response(LearnLessonQuestionSerializer(mapping).data)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def update(self, request, pk=None):
        try:
            mapping = self._get_mapping(int(pk))
        except (LessonQuestion.DoesNotExist, ValueError) as exc:
            raise NotFound('Lesson question not found') from exc

        serializer = LearnLessonQuestionUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        mapping = LessonService.update_mapping_position(
            mapping=mapping,
            position=serializer.validated_data['position'],
            actor=request.user,
        )
        return Response(LearnLessonQuestionSerializer(mapping).data)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def destroy(self, request, pk=None):
        try:
            mapping = self._get_mapping(int(pk))
        except (LessonQuestion.DoesNotExist, ValueError) as exc:
            raise NotFound('Lesson question not found') from exc

        LessonService.delete_mapping(mapping=mapping)
        return Response(status=status.HTTP_204_NO_CONTENT)
