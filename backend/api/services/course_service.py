from django.utils import timezone
from django.db.models import Count

from api.models import Course, CourseNode, CourseTagMap, UserCourseProgress, UserLessonProgress


class CourseService:
    """Domain operations for course view flows."""

    @staticmethod
    def is_editor_or_admin(user):
        if user.is_superuser:
            return True
        return user.user_roles.filter(role__name__in=['Admin', 'Editor']).exists()

    @staticmethod
    def filter_visible_courses(queryset, user, query_params):
        return CourseService.filter_visible_learn_courses(queryset, user, query_params)

    @classmethod
    def filter_visible_learn_courses(cls, queryset, user, query_params):
        status_param = query_params.get('status')

        if not cls.is_editor_or_admin(user):
            queryset = queryset.filter(status=Course.Status.PUBLISHED)
        elif status_param:
            queryset = queryset.filter(status=status_param)

        category = query_params.get('category') or query_params.get('category_id')
        if category:
            queryset = queryset.filter(category_id=category)

        search = query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)

        return queryset.select_related('category').prefetch_related('tag_mappings__tag').order_by('id')

    @staticmethod
    def get_course_tree_nodes(course):
        return CourseNode.objects.filter(course=course, parent__isnull=True).prefetch_related('children', 'lesson')

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

        if not actor.is_superuser and not actor.user_roles.filter(role__name='Admin').exists():
            raise PermissionError('Only Admin can purge a course')

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