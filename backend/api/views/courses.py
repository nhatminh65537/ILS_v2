from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from auth_app.permissions import add_role_granted

from api.models import Course, Lesson
from api.serializers import (
    CourseDetailSerializer,
    CourseListSerializer,
    CourseNodeSerializer,
    LessonSerializer,
    UserCourseProgressSerializer,
)
from api.services.course_service import CourseService


@add_role_granted('Admin', 'Editor', 'Member')
class CourseViewSet(viewsets.ModelViewSet):
    """Course management viewset."""

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
