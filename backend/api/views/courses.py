from django.db import IntegrityError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from auth_app.permissions import HasJWTPermission, add_role_granted

from api.models import Course, CourseCategory, CourseTag, Lesson
from api.serializers import (
    CourseDetailSerializer,
    CourseListSerializer,
    CourseNodeSerializer,
    CourseCategorySerializer,
    CourseTagSerializer,
    LearnCourseDetailSerializer,
    LearnCourseListSerializer,
    LearnCourseWriteSerializer,
    LessonSerializer,
    UserCourseProgressSerializer,
)
from api.services.course_service import CourseService


@add_role_granted('Admin', 'Editor', 'Member')
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

    @add_role_granted('Admin', 'Editor')
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @add_role_granted('Admin', 'Editor')
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


@add_role_granted('Admin', 'Editor', 'Member')
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


@add_role_granted('Admin', 'Editor', 'Member')
class LearnCourseViewSet(viewsets.ModelViewSet):
    """Canonical namespaced course CRUD API under /api/learn/courses/."""

    queryset = Course.objects.all().select_related('category').prefetch_related('tag_mappings__tag')
    permission_classes = [IsAuthenticated, HasJWTPermission]
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

    @add_role_granted('Admin', 'Editor')
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

    @add_role_granted('Admin', 'Editor')
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

    @add_role_granted('Admin', 'Editor')
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


@add_role_granted('Admin', 'Editor', 'Member')
class LearnCourseCategoryViewSet(viewsets.ModelViewSet):
    """Canonical namespaced category CRUD API under /api/learn/categories/."""

    queryset = CourseCategory.objects.all().order_by('name')
    serializer_class = CourseCategorySerializer
    permission_classes = [IsAuthenticated, HasJWTPermission]

    @add_role_granted('Admin')
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @add_role_granted('Admin')
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @add_role_granted('Admin')
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @add_role_granted('Admin')
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)


@add_role_granted('Admin', 'Editor', 'Member')
class LearnCourseTagViewSet(viewsets.ModelViewSet):
    """Canonical namespaced tag CRUD API under /api/learn/tags/."""

    queryset = CourseTag.objects.all().order_by('name')
    serializer_class = CourseTagSerializer
    permission_classes = [IsAuthenticated, HasJWTPermission]

    @add_role_granted('Admin', 'Editor')
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @add_role_granted('Admin', 'Editor')
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @add_role_granted('Admin', 'Editor')
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @add_role_granted('Admin', 'Editor')
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)
