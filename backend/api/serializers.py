"""
Serializers for API
Handles data serialization/deserialization for all models
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import (
    # User models
    User, UserProfile, UserAuthProvider, UserSession,
    # Authorization models
    Permission, Role, UserRole, RolePermission, UserPermission, UserPermissionCache,
    # Course models
    Course, CourseCategory, CourseTag, CourseTagMap,
    Lesson, CourseNode, LessonQuestion, LessonOutline,
    UserCourseProgress, UserLessonProgress,
    # Challenge models
    Challenge, ChallengeCategory, ChallengeTag, ChallengeTagMap,
    ChallengeNode, ChallengeGitlab, ChallengeFlag,
    ChallengeInstance, ChallengeInstanceLog,
    UserChallengeProgress, UserChallengeSubmit,
    # Quiz models
    Quiz, QuizNode, QuizCategory, QuizTag, QuizTagMap,
    QuizQuestion, QuizQuestionOption, QuizQuestionAnswer,
    UserQuizAttempt, UserQuizAnswer, QuizConfig,
    # System models
    SystemConfig, Notification, AuditLog
)


# ============================================================================
# USER SERIALIZERS
# ============================================================================

class UserSerializer(serializers.ModelSerializer):
    """User serializer"""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                  'is_active', 'date_joined', 'last_login']
        read_only_fields = ['id', 'date_joined', 'last_login']


class UserCreateSerializer(serializers.ModelSerializer):
    """User creation serializer with password handling"""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 
                  'first_name', 'last_name']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password': 'Passwords do not match'})
        attrs.pop('password_confirm')
        return attrs
    
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        # Create profile
        UserProfile.objects.create(user=user)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """User profile serializer"""
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'user_id', 'username', 'entry_year', 'display_name', 'avatar_url', 'bio',
            'location', 'website', 'language', 'theme', 'timezone',
            'total_learning_point', 'total_challenge_point', 'total_quiz_point',
            'course_completed', 'challenge_completed', 'quiz_completed',
            'last_active_at'
        ]
        read_only_fields = [
            'user_id', 'total_learning_point', 'total_challenge_point', 'total_quiz_point',
            'course_completed', 'challenge_completed', 'quiz_completed', 'last_active_at'
        ]


class UserAuthProviderSerializer(serializers.ModelSerializer):
    """SSO provider serializer"""
    
    class Meta:
        model = UserAuthProvider
        fields = ['id', 'provider', 'external_id', 'is_primary', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserSessionSerializer(serializers.ModelSerializer):
    """User session serializer"""

    class Meta:
        model = UserSession
        fields = [
            'id', 'user', 'device_info', 'refresh_token_hash', 'last_used_at',
            'expires_at', 'revoked_at', 'revoked_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# ============================================================================
# AUTHORIZATION SERIALIZERS
# ============================================================================

class PermissionSerializer(serializers.ModelSerializer):
    """Permission serializer"""
    
    class Meta:
        model = Permission
        fields = ['id', 'name', 'description', 'is_active']
        read_only_fields = ['id']


class RoleSerializer(serializers.ModelSerializer):
    """Role serializer"""
    permissions = PermissionSerializer(many=True, read_only=True, source='get_all_permissions')
    
    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'is_system', 'permissions']
        read_only_fields = ['id', 'is_system']


class UserRoleSerializer(serializers.ModelSerializer):
    """User-Role relationship serializer"""
    role_name = serializers.CharField(source='role.name', read_only=True)
    
    class Meta:
        model = UserRole
        fields = ['id', 'user', 'role', 'role_name', 'created_at']
        read_only_fields = ['id', 'created_at']


# ============================================================================
# COURSE SERIALIZERS
# ============================================================================

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
        fields = ['id', 'slug', 'title', 'description', 'status',
                  'category', 'category_name', 'tags',
                  'estimated_time', 'learning_point', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_tags(self, obj):
        return CourseTagSerializer(
            [tm.tag for tm in obj.tag_mappings.select_related('tag').all()],
            many=True
        ).data


class CourseDetailSerializer(serializers.ModelSerializer):
    """Course detail serializer (with full data)"""
    category = CourseCategorySerializer(read_only=True)
    tags = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ['id', 'slug', 'title', 'description', 'status',
                  'category', 'tags', 'estimated_time', 'learning_point',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_tags(self, obj):
        return CourseTagSerializer(
            [tm.tag for tm in obj.tag_mappings.select_related('tag').all()],
            many=True
        ).data


class LessonSerializer(serializers.ModelSerializer):
    """Lesson serializer"""
    
    class Meta:
        model = Lesson
        fields = ['id', 'lesson_type', 'source', 'content_md', 'video_url',
                  'video_duration', 'learning_point', 'learning_time']
        read_only_fields = ['id']
    
    def validate(self, attrs):
        # Validate based on lesson type
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
        fields = ['id', 'course', 'parent', 'is_item', 'title', 'position', 'path',
                  'lesson', 'children']
        read_only_fields = ['id', 'path']
    
    def get_children(self, obj):
        if obj.is_item:
            return None
        # Only return direct children
        children = obj.children.all()
        return CourseNodeSerializer(children, many=True, context=self.context).data


class UserCourseProgressSerializer(serializers.ModelSerializer):
    """User course progress serializer"""
    course_title = serializers.CharField(source='course.title', read_only=True)
    
    class Meta:
        model = UserCourseProgress
        fields = ['id', 'user', 'course', 'course_title',
                  'started_at', 'completed_at', 'is_completed']
        read_only_fields = ['id', 'is_completed']


class UserLessonProgressSerializer(serializers.ModelSerializer):
    """User lesson progress serializer"""
    
    class Meta:
        model = UserLessonProgress
        fields = ['id', 'user', 'lesson', 'started_at', 'completed_at', 'is_completed']
        read_only_fields = ['id', 'is_completed']


# ============================================================================
# CHALLENGE SERIALIZERS
# ============================================================================

class ChallengeCategorySerializer(serializers.ModelSerializer):
    """Challenge category serializer"""
    
    class Meta:
        model = ChallengeCategory
        fields = ['id', 'name', 'description']


class ChallengeTagSerializer(serializers.ModelSerializer):
    """Challenge tag serializer"""
    
    class Meta:
        model = ChallengeTag
        fields = ['id', 'name', 'description']


class ChallengeListSerializer(serializers.ModelSerializer):
    """Challenge list serializer (minimal fields)"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    tags = serializers.SerializerMethodField()

    class Meta:
        model = Challenge
        fields = ['id', 'title', 'description', 'status', 'difficulty',
                  'category', 'category_name', 'tags',
                  'challenge_point', 'instance_required', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_tags(self, obj):
        return ChallengeTagSerializer(
            [tm.tag for tm in obj.tag_mappings.select_related('tag').all()],
            many=True
        ).data


class ChallengeDetailSerializer(serializers.ModelSerializer):
    """Challenge detail serializer"""
    category = ChallengeCategorySerializer(read_only=True)
    tags = serializers.SerializerMethodField()

    class Meta:
        model = Challenge
        fields = ['id', 'title', 'description', 'status', 'difficulty',
                  'category', 'tags', 'source', 'storage_path', 'gitlab_path',
                  'challenge_point', 'instance_required',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_tags(self, obj):
        return ChallengeTagSerializer(
            [tm.tag for tm in obj.tag_mappings.select_related('tag').all()],
            many=True
        ).data


class ChallengeFlagSubmitSerializer(serializers.Serializer):
    """Serializer for flag submission"""
    flag = serializers.CharField(required=True)
    
    def validate_flag(self, value):
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError('Flag cannot be empty')
        return value.strip()


class ChallengeInstanceSerializer(serializers.ModelSerializer):
    """Challenge instance serializer"""
    challenge_title = serializers.CharField(source='challenge.title', read_only=True)
    
    class Meta:
        model = ChallengeInstance
        fields = ['id', 'challenge', 'challenge_title', 'user',
                  'instance_info', 'status', 'created_at', 'terminated_at']
        read_only_fields = ['id', 'instance_info', 'flag_value', 'created_at', 'terminated_at']


class UserChallengeProgressSerializer(serializers.ModelSerializer):
    """User challenge progress serializer"""
    challenge_title = serializers.CharField(source='challenge.title', read_only=True)
    
    class Meta:
        model = UserChallengeProgress
        fields = ['id', 'user', 'challenge', 'challenge_title',
                  'completed_at', 'is_completed']
        read_only_fields = ['id', 'is_completed']


# ============================================================================
# QUIZ SERIALIZERS
# ============================================================================

class QuizCategorySerializer(serializers.ModelSerializer):
    """Quiz category serializer"""
    
    class Meta:
        model = QuizCategory
        fields = ['id', 'name', 'description']


class QuizTagSerializer(serializers.ModelSerializer):
    """Quiz tag serializer"""
    
    class Meta:
        model = QuizTag
        fields = ['id', 'name', 'description']


class QuizQuestionOptionSerializer(serializers.ModelSerializer):
    """Quiz question option serializer"""
    
    class Meta:
        model = QuizQuestionOption
        fields = ['id', 'content', 'position']
        # Don't expose is_correct to users


class QuizQuestionSerializer(serializers.ModelSerializer):
    """Quiz question serializer"""
    options = QuizQuestionOptionSerializer(many=True, read_only=True)
    
    class Meta:
        model = QuizQuestion
        fields = ['id', 'question_type', 'content', 'explanation',
                  'score', 'position', 'options']
        read_only_fields = ['id']


class QuizListSerializer(serializers.ModelSerializer):
    """Quiz list serializer"""
    tags = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = ['id', 'title', 'description', 'status', 'tags',
                  'quiz_point', 'total_questions', 'time_limit_sec']
        read_only_fields = ['id']

    def get_tags(self, obj):
        return QuizTagSerializer(
            [tm.tag for tm in obj.tag_mappings.select_related('tag').all()],
            many=True
        ).data


class QuizDetailSerializer(serializers.ModelSerializer):
    """Quiz detail serializer with questions"""
    questions = QuizQuestionSerializer(many=True, read_only=True)
    tags = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = ['id', 'title', 'description', 'status', 'tags',
                  'quiz_point', 'total_questions', 'time_limit_sec',
                  'questions']
        read_only_fields = ['id']

    def get_tags(self, obj):
        return QuizTagSerializer(
            [tm.tag for tm in obj.tag_mappings.select_related('tag').all()],
            many=True
        ).data


class QuizAnswerSubmitSerializer(serializers.Serializer):
    """Serializer for quiz answer submission"""
    question_id = serializers.IntegerField()
    answer_data = serializers.JSONField()


class UserQuizAttemptSerializer(serializers.ModelSerializer):
    """User quiz attempt serializer"""
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    
    class Meta:
        model = UserQuizAttempt
        fields = ['id', 'quiz', 'quiz_title', 'user', 'config',
                  'started_at', 'finished_at', 'total_score', 'is_finished']
        read_only_fields = ['id', 'total_score', 'is_finished']


# ============================================================================
# SYSTEM SERIALIZERS
# ============================================================================

class SystemConfigSerializer(serializers.ModelSerializer):
    """System configuration serializer"""
    
    class Meta:
        model = SystemConfig
        fields = ['id', 'key', 'value', 'value_type', 'category', 'description', 'is_editable', 'is_runtime']
        read_only_fields = ['id']


class NotificationSerializer(serializers.ModelSerializer):
    """Notification serializer"""
    
    class Meta:
        model = Notification
        fields = ['id', 'type', 'title', 'message', 'metadata',
                  'is_read', 'read_at', 'created_at']
        read_only_fields = ['id', 'created_at', 'read_at']


class AuditLogSerializer(serializers.ModelSerializer):
    """Audit log serializer"""
    
    class Meta:
        model = AuditLog
        fields = ['id', 'timestamp', 'actor_type', 'actor_id', 'actor_username',
                  'aggregate_type', 'aggregate_id', 'action', 'metadata',
                  'ip_address', 'user_agent']
        read_only_fields = '__all__'
