"""
Serializers for API
Handles data serialization/deserialization for all models
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
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
    QuizConfig, UserQuizProgress,
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


class AdminRoleSummarySerializer(serializers.ModelSerializer):
    """Compact role serializer for admin user management responses."""

    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'is_system']
        read_only_fields = fields


class AdminUserManagementSerializer(serializers.ModelSerializer):
    """Admin user serializer with profile and role management support."""

    profile = serializers.SerializerMethodField(read_only=True)
    roles = serializers.SerializerMethodField(read_only=True)
    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=False,
        validators=[validate_password],
    )
    role_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
        write_only=True,
    )

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_active', 'is_staff', 'is_superuser', 'date_joined', 'last_login',
            'password', 'role_ids', 'profile', 'roles',
        ]
        read_only_fields = ['id', 'is_staff', 'is_superuser', 'date_joined', 'last_login', 'profile', 'roles']

    def get_profile(self, obj):
        profile = getattr(obj, 'profile', None)
        if profile is None:
            return None
        return UserProfileSerializer(profile).data

    def get_roles(self, obj):
        user_roles = obj.user_roles.select_related('role').all()
        return AdminRoleSummarySerializer([user_role.role for user_role in user_roles], many=True).data

    def validate_role_ids(self, value):
        unique_role_ids = []
        seen = set()
        for role_id in value:
            if role_id not in seen:
                unique_role_ids.append(role_id)
                seen.add(role_id)

        if not unique_role_ids:
            return unique_role_ids

        existing_role_ids = set(Role.objects.filter(id__in=unique_role_ids).values_list('id', flat=True))
        missing_role_ids = [role_id for role_id in unique_role_ids if role_id not in existing_role_ids]
        if missing_role_ids:
            raise serializers.ValidationError({'role_ids': f'Role ids not found: {missing_role_ids}'})
        return unique_role_ids

    @staticmethod
    def _default_member_role_ids():
        member_role = Role.objects.filter(name='Member').order_by('id').first()
        if member_role is None:
            return []
        return [member_role.id]

    @staticmethod
    def _sync_roles(user, role_ids):
        from .services.permission_service import PermissionService

        normalized_role_ids = list(dict.fromkeys(role_ids or []))
        current_role_ids = list(user.user_roles.values_list('role_id', flat=True))
        if sorted(current_role_ids) == sorted(normalized_role_ids):
            return False

        UserRole.objects.filter(user=user).delete()
        if normalized_role_ids:
            roles = list(Role.objects.filter(id__in=normalized_role_ids))
            if len(roles) != len(normalized_role_ids):
                raise serializers.ValidationError({'role_ids': 'One or more roles were not found.'})
            UserRole.objects.bulk_create([UserRole(user=user, role=role) for role in roles])

        PermissionService.invalidate_cache(user)
        return True

    @staticmethod
    def _apply_password(user, password):
        if password is None:
            user.set_unusable_password()
        else:
            user.set_password(password)
        user.save(update_fields=['password'])

    @staticmethod
    def _ensure_profile(user):
        UserProfile.objects.get_or_create(user=user)

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        role_ids_provided = 'role_ids' in self.initial_data
        role_ids = validated_data.pop('role_ids', None)

        with transaction.atomic():
            from auth_app.services.session_service import SessionService

            user = User.objects.create_user(password=password, **validated_data)
            if password is None:
                self._apply_password(user, None)

            self._ensure_profile(user)

            if role_ids_provided:
                self._sync_roles(user, role_ids)
            else:
                self._sync_roles(user, self._default_member_role_ids())

            if not user.is_active:
                SessionService().revoke_all_user_sessions(user)

            return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', serializers.empty)
        role_ids_provided = 'role_ids' in self.initial_data
        role_ids = validated_data.pop('role_ids', None)
        is_active_changed = 'is_active' in validated_data

        with transaction.atomic():
            from auth_app.services.session_service import SessionService

            user = super().update(instance, validated_data)

            if password is not serializers.empty:
                self._apply_password(user, password)

            if role_ids_provided:
                self._sync_roles(user, role_ids)

            if is_active_changed:
                user.invalidate_permission_cache()

            if not user.is_active:
                SessionService().revoke_all_user_sessions(user)

            return user


class MeProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for PATCH /api/users/me/profile/."""

    class Meta:
        model = UserProfile
        fields = ['entry_year', 'display_name', 'avatar_url', 'bio', 'location', 'website']


class MeSettingsUpdateSerializer(serializers.ModelSerializer):
    """Serializer for PATCH /api/users/me/settings/."""

    class Meta:
        model = UserProfile
        fields = ['language', 'theme', 'timezone']


class MeAccountUpdateSerializer(serializers.ModelSerializer):
    """Serializer for PATCH /api/users/me/account/."""

    class Meta:
        model = User
        fields = ['username', 'email']
        extra_kwargs = {
            'username': {'required': False},
            'email': {'required': False},
        }

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError('At least one field must be provided')
        return attrs

    def validate_username(self, value):
        user = self.instance
        if User.objects.exclude(pk=user.pk).filter(username__iexact=value).exists():
            raise serializers.ValidationError('A user with that username already exists.')
        return value

    def validate_email(self, value):
        user = self.instance
        if value and User.objects.exclude(pk=user.pk).filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with that email already exists.')
        return value


class PublicUserProfileSerializer(serializers.ModelSerializer):
    """Public profile serializer for /api/users/{username}/profile/."""

    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'username', 'entry_year', 'display_name', 'avatar_url', 'bio', 'location', 'website',
            'total_learning_point', 'total_challenge_point', 'total_quiz_point',
            'course_completed', 'challenge_completed', 'quiz_completed', 'last_active_at'
        ]


class ActivityEventSerializer(serializers.Serializer):
    """Serializer for unified activity feed items."""

    type = serializers.CharField()
    timestamp = serializers.DateTimeField()
    item_title = serializers.CharField(allow_blank=True, allow_null=True)
    source_id = serializers.IntegerField(allow_null=True)


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


class RolePermissionSerializer(serializers.Serializer):
    """
    Serializer for assigning/revoking permissions to/from roles.
    Used in POST /api/admin/roles/{id}/permissions/
    """
    permission_id = serializers.IntegerField(required=True)
    
    def validate_permission_id(self, value):
        """Validate permission exists and is active"""
        try:
            permission = Permission.objects.get(id=value, is_active=True)
        except Permission.DoesNotExist:
            raise serializers.ValidationError("Permission not found or inactive")
        return value


class PermissionTreeSerializer(serializers.ModelSerializer):
    """
    Serializer for displaying all permissions in a flat list.
    (Permissions are flat per R-AUTH-04; no hierarchy)
    """
    
    class Meta:
        model = Permission
        fields = ['id', 'name', 'description', 'is_active']
        read_only_fields = ['id', 'name', 'description', 'is_active']


class UserRoleAssignmentSerializer(serializers.Serializer):
    """
    Serializer for assigning roles to users.
    Used in POST /api/users/{id}/roles/
    """
    role_id = serializers.IntegerField(required=True)
    
    def validate_role_id(self, value):
        """Validate role exists"""
        try:
            Role.objects.get(id=value)
        except Role.DoesNotExist:
            raise serializers.ValidationError("Role not found")
        return value


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


class QuizNodeSerializer(serializers.ModelSerializer):
    """Quiz node serializer for tree CRUD endpoints (folder-only in MVP)."""

    has_children = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = QuizNode
        fields = [
            'id',
            'parent',
            'is_item',
            'title',
            'position',
            'path',
            'quiz',
            'has_children',
        ]
        read_only_fields = ['id', 'path', 'has_children']

    def validate_is_item(self, value):
        if value:
            raise serializers.ValidationError('QuizNode item mode is not supported in MVP. Use folder nodes only.')
        return value

    def validate_quiz(self, value):
        if value is not None:
            raise serializers.ValidationError('Quiz linkage is not supported in Task 7.2. Use folder nodes only.')
        return value

    def validate(self, attrs):
        parent = attrs.get('parent')
        instance = getattr(self, 'instance', None)

        if parent and instance and parent.id == instance.id:
            raise serializers.ValidationError({'parent': 'Node cannot be parent of itself.'})

        return attrs

    def create(self, validated_data):
        validated_data['is_item'] = False
        validated_data['quiz'] = None
        node = super().create(validated_data)
        node.rebuild_path()
        return node

    def update(self, instance, validated_data):
        new_parent = validated_data.pop('parent', instance.parent)
        validated_data['is_item'] = False
        validated_data['quiz'] = None

        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()

        if new_parent != instance.parent:
            instance.move_to(new_parent)
        else:
            instance.rebuild_path()

        return instance

    def get_has_children(self, obj):
        return obj.children.exists()


class QuizQuestionOptionSerializer(serializers.ModelSerializer):
    """Quiz question option serializer"""
    
    class Meta:
        model = QuizQuestionOption
        fields = ['id', 'content', 'position']
        # Don't expose is_correct to users


class QuizQuestionOptionManageSerializer(serializers.ModelSerializer):
    """Quiz question option serializer for authoring endpoints."""

    class Meta:
        model = QuizQuestionOption
        fields = ['id', 'content', 'position', 'is_correct']
        read_only_fields = ['id']


class QuizQuestionAnswerManageSerializer(serializers.ModelSerializer):
    """Accepted answer serializer for fill_blank questions."""

    class Meta:
        model = QuizQuestionAnswer
        fields = ['id', 'answer']
        read_only_fields = ['id']


class QuizQuestionSerializer(serializers.ModelSerializer):
    """Quiz question serializer"""
    options = QuizQuestionOptionSerializer(many=True, read_only=True)
    
    class Meta:
        model = QuizQuestion
        fields = ['id', 'question_type', 'content', 'explanation',
                  'score', 'position', 'options']
        read_only_fields = ['id']


class QuizQuestionManageSerializer(serializers.ModelSerializer):
    """Quiz question serializer with nested option/answer writes for editor/admin."""

    options = QuizQuestionOptionManageSerializer(many=True, required=False)
    answers = QuizQuestionAnswerManageSerializer(many=True, required=False)

    class Meta:
        model = QuizQuestion
        fields = [
            'id',
            'status',
            'question_type',
            'content',
            'explanation',
            'case_sensitive',
            'score',
            'position',
            'options',
            'answers',
        ]
        read_only_fields = ['id']

    def validate_content(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('content must be a JSON object.')
        if not value.get('text'):
            raise serializers.ValidationError('content.text is required.')
        return value

    def validate(self, attrs):
        question_type = attrs.get('question_type', getattr(self.instance, 'question_type', None))
        options = attrs.get('options', None)
        answers = attrs.get('answers', None)

        if question_type in {QuizQuestion.QuestionType.SINGLE_CHOICE, QuizQuestion.QuestionType.MULTI_CHOICE}:
            if options is None and self.instance is None:
                raise serializers.ValidationError({'options': 'options are required for choice questions.'})

            if options is not None:
                if len(options) < 2:
                    raise serializers.ValidationError({'options': 'At least 2 options are required.'})
                correct_count = sum(1 for option in options if option.get('is_correct'))
                if question_type == QuizQuestion.QuestionType.SINGLE_CHOICE and correct_count != 1:
                    raise serializers.ValidationError({'options': 'single_choice requires exactly 1 correct option.'})
                if question_type == QuizQuestion.QuestionType.MULTI_CHOICE and correct_count < 1:
                    raise serializers.ValidationError({'options': 'multi_choice requires at least 1 correct option.'})

        if question_type == QuizQuestion.QuestionType.FILL_BLANK:
            if answers is None and self.instance is None:
                raise serializers.ValidationError({'answers': 'answers are required for fill_blank questions.'})
            if answers is not None and len([item for item in answers if item.get('answer')]) == 0:
                raise serializers.ValidationError({'answers': 'Provide at least 1 accepted answer.'})

        return attrs

    def create(self, validated_data):
        options = validated_data.pop('options', [])
        answers = validated_data.pop('answers', [])
        question = QuizQuestion.objects.create(**validated_data)
        self._replace_options(question, options)
        self._replace_answers(question, answers)
        return question

    def update(self, instance, validated_data):
        options = validated_data.pop('options', None)
        answers = validated_data.pop('answers', None)

        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()

        if options is not None:
            self._replace_options(instance, options)
        if answers is not None:
            self._replace_answers(instance, answers)

        return instance

    def _replace_options(self, question, options):
        if question.question_type not in {
            QuizQuestion.QuestionType.SINGLE_CHOICE,
            QuizQuestion.QuestionType.MULTI_CHOICE,
        }:
            question.options.all().delete()
            return

        question.options.all().delete()
        QuizQuestionOption.objects.bulk_create(
            [
                QuizQuestionOption(
                    question=question,
                    content=option['content'],
                    position=option.get('position', index),
                    is_correct=bool(option.get('is_correct', False)),
                )
                for index, option in enumerate(options)
            ]
        )

    def _replace_answers(self, question, answers):
        if question.question_type != QuizQuestion.QuestionType.FILL_BLANK:
            question.answers.all().delete()
            return

        question.answers.all().delete()
        QuizQuestionAnswer.objects.bulk_create(
            [
                QuizQuestionAnswer(question=question, answer=item['answer'])
                for item in answers
                if item.get('answer')
            ]
        )


class QuizListSerializer(serializers.ModelSerializer):
    """Quiz list serializer"""
    tags = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = ['id', 'title', 'description', 'status', 'tags',
                  'quiz_point', 'total_questions', 'time_limit_sec', 'updated_at']
        read_only_fields = ['id', 'updated_at']

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
                  'updated_at', 'questions']
        read_only_fields = ['id', 'updated_at']

    def get_tags(self, obj):
        return QuizTagSerializer(
            [tm.tag for tm in obj.tag_mappings.select_related('tag').all()],
            many=True
        ).data


class QuizConfigSerializer(serializers.ModelSerializer):
    """Per-user quiz config serializer for Task 7.1 endpoint contract."""

    class Meta:
        model = QuizConfig
        fields = [
            'id',
            'quiz',
            'user',
            'total_questions',
            'time_limit_sec',
            'random_question',
            'random_option',
            'allow_review',
            'allow_retry',
            'max_attempt',
            'is_default',
            'is_active',
        ]
        read_only_fields = ['id', 'quiz', 'user', 'is_default']

    def validate_total_questions(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError('total_questions must be > 0 when provided.')
        return value

    def validate_time_limit_sec(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError('time_limit_sec must be > 0 when provided.')
        return value

    def validate_max_attempt(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError('max_attempt must be > 0 when provided.')
        return value


class UserQuizProgressSerializer(serializers.ModelSerializer):
    """User quiz progress serializer for GET /api/quiz/quizzes/{id}/progress/."""

    user_id = serializers.IntegerField(source='user_id', read_only=True)
    quiz_id = serializers.IntegerField(source='quiz_id', read_only=True)

    class Meta:
        model = UserQuizProgress
        fields = [
            'id',
            'user_id',
            'quiz_id',
            'best_score',
            'attempt_count',
            'first_attempted_at',
            'last_attempted_at',
        ]
        read_only_fields = fields


# ============================================================================
# SYSTEM SERIALIZERS
# ============================================================================

class SystemConfigSerializer(serializers.ModelSerializer):
    """System configuration serializer"""

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.value_type == SystemConfig.ConfigType.SECRET:
            data['value'] = '***'
        return data

    def validate_value(self, value):
        instance = getattr(self, 'instance', None)
        value_type = instance.value_type if instance else self.initial_data.get('value_type')

        if value_type == SystemConfig.ConfigType.BOOL:
            if isinstance(value, bool):
                return value
            if isinstance(value, str):
                lowered = value.strip().lower()
                if lowered in {'true', 'false'}:
                    return lowered == 'true'
            raise serializers.ValidationError('Value must be a boolean (true/false).')

        if value_type == SystemConfig.ConfigType.INT:
            if isinstance(value, bool):
                raise serializers.ValidationError('Value must be an integer.')
            if isinstance(value, int):
                return value
            if isinstance(value, str):
                try:
                    return int(value.strip())
                except ValueError:
                    pass
            raise serializers.ValidationError('Value must be an integer.')

        if value_type == SystemConfig.ConfigType.STRING:
            if not isinstance(value, str):
                raise serializers.ValidationError('Value must be a string.')
            return value

        if value_type == SystemConfig.ConfigType.JSON:
            if not isinstance(value, (dict, list)):
                raise serializers.ValidationError('Value must be a JSON object or array.')
            return value

        if value_type == SystemConfig.ConfigType.SECRET:
            if not isinstance(value, str):
                raise serializers.ValidationError('Value must be a string.')
            return value

        raise serializers.ValidationError('Unsupported config value_type.')

    def update(self, instance, validated_data):
        instance.value = validated_data['value']
        instance.save(update_fields=['value', 'updated_at'])
        return instance
    
    class Meta:
        model = SystemConfig
        fields = ['id', 'key', 'value', 'value_type', 'category', 'description', 'is_editable', 'is_runtime']
        read_only_fields = ['id', 'key', 'value_type', 'category', 'description', 'is_editable', 'is_runtime']


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
