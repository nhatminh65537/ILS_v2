from rest_framework import serializers

from api.models import Course, CourseCategory, CourseNode, CourseTag, Lesson, UserCourseProgress, UserLessonProgress


class CourseCategorySerializer(serializers.ModelSerializer):
    """Course category serializer"""

    class Meta:
        model = CourseCategory
        fields = ['id', 'name', 'description']


class CourseTagSerializer(serializers.ModelSerializer):
    """Course tag serializer"""

    class Meta:
        model = CourseTag
        fields = ['id', 'name', 'description']


class CourseListSerializer(serializers.ModelSerializer):
    """Course list serializer (minimal fields)"""

    category_name = serializers.CharField(source='category.name', read_only=True)
    tags = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id',
            'slug',
            'title',
            'description',
            'status',
            'category',
            'category_name',
            'tags',
            'estimated_time',
            'learning_point',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_tags(self, obj):
        return CourseTagSerializer([tm.tag for tm in obj.tag_mappings.select_related('tag').all()], many=True).data


class CourseDetailSerializer(serializers.ModelSerializer):
    """Course detail serializer (with full data)"""

    category = CourseCategorySerializer(read_only=True)
    tags = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id',
            'slug',
            'title',
            'description',
            'status',
            'category',
            'tags',
            'estimated_time',
            'learning_point',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_tags(self, obj):
        return CourseTagSerializer([tm.tag for tm in obj.tag_mappings.select_related('tag').all()], many=True).data


class LessonSerializer(serializers.ModelSerializer):
    """Lesson serializer"""

    class Meta:
        model = Lesson
        fields = [
            'id',
            'lesson_type',
            'source',
            'content_md',
            'video_url',
            'video_duration',
            'learning_point',
            'learning_time',
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        lesson_type = attrs.get('lesson_type')
        if lesson_type == Lesson.LessonType.MARKDOWN and not attrs.get('content_md'):
            raise serializers.ValidationError({'content_md': 'Required for markdown lessons'})
        if lesson_type == Lesson.LessonType.VIDEO and not attrs.get('video_url'):
            raise serializers.ValidationError({'video_url': 'Required for video lessons'})
        return attrs


class CourseNodeSerializer(serializers.ModelSerializer):
    """Course node (tree structure) serializer"""

    lesson = LessonSerializer(read_only=True)
    children = serializers.SerializerMethodField()

    class Meta:
        model = CourseNode
        fields = ['id', 'course', 'parent', 'is_item', 'title', 'position', 'path', 'lesson', 'children']
        read_only_fields = ['id', 'path']

    def get_children(self, obj):
        if obj.is_item:
            return None
        children = obj.children.all()
        return CourseNodeSerializer(children, many=True, context=self.context).data


class UserCourseProgressSerializer(serializers.ModelSerializer):
    """User course progress serializer"""

    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = UserCourseProgress
        fields = ['id', 'user', 'course', 'course_title', 'started_at', 'completed_at', 'is_completed']
        read_only_fields = ['id', 'is_completed']


class UserLessonProgressSerializer(serializers.ModelSerializer):
    """User lesson progress serializer"""

    class Meta:
        model = UserLessonProgress
        fields = ['id', 'user', 'lesson', 'started_at', 'completed_at', 'is_completed']
        read_only_fields = ['id', 'is_completed']
