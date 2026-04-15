import re

from rest_framework import serializers

from api.models import Course, CourseCategory, CourseNode, CourseTag, Lesson, UserCourseProgress, UserLessonProgress


class CourseCategorySerializer(serializers.ModelSerializer):
    """Course category serializer"""

    def validate_name(self, value):
        normalized = value.strip()
        queryset = CourseCategory.objects.filter(name__iexact=normalized)
        if self.instance:
            queryset = queryset.exclude(id=self.instance.id)
        if queryset.exists():
            raise serializers.ValidationError('Category name already exists.')
        return normalized

    class Meta:
        model = CourseCategory
        fields = ['id', 'name', 'description']


class CourseTagSerializer(serializers.ModelSerializer):
    """Course tag serializer"""

    def validate_name(self, value):
        normalized = value.strip()
        queryset = CourseTag.objects.filter(name__iexact=normalized)
        if self.instance:
            queryset = queryset.exclude(id=self.instance.id)
        if queryset.exists():
            raise serializers.ValidationError('Tag name already exists.')
        return normalized

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


class LearnCourseListSerializer(serializers.ModelSerializer):
    """Course list serializer for canonical /api/learn/courses/ endpoints."""

    category = CourseCategorySerializer(read_only=True)
    tags = serializers.SerializerMethodField()
    user_progress = serializers.SerializerMethodField()

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
            'user_progress',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_tags(self, obj):
        return CourseTagSerializer([tm.tag for tm in obj.tag_mappings.select_related('tag').all()], many=True).data

    def get_user_progress(self, obj):
        progress_map = self.context.get('progress_map', {})
        progress = progress_map.get(obj.id, {'completed': 0, 'total': 0})
        return {
            'completed': progress.get('completed', 0),
            'total': progress.get('total', 0),
        }


class LearnCourseDetailSerializer(serializers.ModelSerializer):
    """Course detail serializer for canonical /api/learn/courses/{slug}/ endpoints."""

    category = CourseCategorySerializer(read_only=True)
    tags = serializers.SerializerMethodField()
    user_progress = serializers.SerializerMethodField()

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
            'user_progress',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_tags(self, obj):
        return CourseTagSerializer([tm.tag for tm in obj.tag_mappings.select_related('tag').all()], many=True).data

    def get_user_progress(self, obj):
        progress_map = self.context.get('progress_map', {})
        progress = progress_map.get(obj.id, {'completed': 0, 'total': 0})
        return {
            'completed': progress.get('completed', 0),
            'total': progress.get('total', 0),
        }


class LearnCourseWriteSerializer(serializers.ModelSerializer):
    """Write serializer for canonical /api/learn/courses/ endpoints."""

    category_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        write_only=True,
    )
    category = CourseCategorySerializer(read_only=True)
    tags = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Course
        fields = [
            'id',
            'slug',
            'title',
            'description',
            'status',
            'category_id',
            'category',
            'tag_ids',
            'tags',
            'estimated_time',
            'learning_point',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'category', 'tags']

    def get_tags(self, obj):
        return CourseTagSerializer([tm.tag for tm in obj.tag_mappings.select_related('tag').all()], many=True).data

    def validate_slug(self, value):
        normalized = (value or '').strip().lower()
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', normalized):
            raise serializers.ValidationError(
                'Slug must contain only lowercase letters, numbers, and hyphens.'
            )
        return normalized

    def validate_category_id(self, value):
        if value is None:
            return value
        if not CourseCategory.objects.filter(id=value).exists():
            raise serializers.ValidationError('Invalid category_id.')
        return value

    def validate_tag_ids(self, value):
        tag_ids = sorted(set(value or []))
        if not tag_ids:
            return tag_ids

        found_ids = set(CourseTag.objects.filter(id__in=tag_ids).values_list('id', flat=True))
        missing = [tag_id for tag_id in tag_ids if tag_id not in found_ids]
        if missing:
            raise serializers.ValidationError(f'Invalid tag_ids: {missing}')
        return tag_ids

    def validate(self, attrs):
        if self.instance and 'slug' in attrs and attrs['slug'] != self.instance.slug:
            raise serializers.ValidationError({'slug': 'Slug is immutable after creation.'})
        return attrs

    def create(self, validated_data):
        from api.services.course_service import CourseService

        category_id = validated_data.pop('category_id', None)
        tag_ids = validated_data.pop('tag_ids', [])

        if category_id is not None:
            validated_data['category'] = CourseCategory.objects.get(id=category_id)

        course = Course.objects.create(**validated_data)
        CourseService.upsert_course_tags(course, tag_ids)
        return course

    def update(self, instance, validated_data):
        from api.services.course_service import CourseService

        category_id = validated_data.pop('category_id', serializers.empty)
        tag_ids = validated_data.pop('tag_ids', serializers.empty)

        if category_id is not serializers.empty:
            if category_id is None:
                instance.category = None
            else:
                instance.category = CourseCategory.objects.get(id=category_id)

        for key, value in validated_data.items():
            setattr(instance, key, value)

        instance.save()

        if tag_ids is not serializers.empty:
            CourseService.upsert_course_tags(instance, tag_ids)

        return instance


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
