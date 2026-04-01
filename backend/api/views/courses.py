from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from auth_app.permissions import add_role_granted

from api.models import Course, CourseNode, Lesson, UserCourseProgress
from api.serializers import (
    CourseDetailSerializer,
    CourseListSerializer,
    CourseNodeSerializer,
    LessonSerializer,
    UserCourseProgressSerializer,
)


@add_role_granted('Admin', 'Editor', 'Member')
class CourseViewSet(viewsets.ModelViewSet):
    """Course management viewset."""

    def get_queryset(self):
        queryset = Course.objects.all()

        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        elif not self.request.user.is_staff:
            queryset = queryset.filter(status=Course.Status.PUBLISHED)

        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category_id=category)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)

        return queryset.select_related('category')

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
        nodes = CourseNode.objects.filter(course=course, parent__isnull=True).prefetch_related('children', 'lesson')
        serializer = CourseNodeSerializer(nodes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        course = self.get_object()
        progress, _ = UserCourseProgress.objects.get_or_create(user=request.user, course=course)
        serializer = UserCourseProgressSerializer(progress)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def enroll(self, request, pk=None):
        course = self.get_object()
        progress, created = UserCourseProgress.objects.get_or_create(user=request.user, course=course)
        if created:
            progress.started_at = timezone.now()
            progress.save()
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
