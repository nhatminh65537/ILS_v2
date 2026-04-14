from django.utils import timezone

from api.models import Course, CourseNode, UserCourseProgress


class CourseService:
    """Domain operations for course view flows."""

    @staticmethod
    def filter_visible_courses(queryset, user, query_params):
        status_param = query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        elif not user.is_staff:
            queryset = queryset.filter(status=Course.Status.PUBLISHED)

        category = query_params.get('category')
        if category:
            queryset = queryset.filter(category_id=category)

        search = query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)

        return queryset.select_related('category')

    @staticmethod
    def get_course_tree_nodes(course):
        return CourseNode.objects.filter(course=course, parent__isnull=True).prefetch_related('children', 'lesson')

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