from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from api.models import Role, User, UserAuthProvider, UserProfile, UserRole, UserSession


class UserSerializer(serializers.ModelSerializer):
    """User serializer"""

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'is_active',
            'date_joined',
            'last_login',
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']


class UserCreateSerializer(serializers.ModelSerializer):
    """User creation serializer with password handling"""

    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password': 'Passwords do not match'})
        attrs.pop('password_confirm')
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        UserProfile.objects.create(user=user)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """User profile serializer"""

    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'user_id',
            'username',
            'entry_year',
            'display_name',
            'avatar_url',
            'bio',
            'location',
            'website',
            'language',
            'theme',
            'timezone',
            'total_learning_point',
            'total_challenge_point',
            'total_quiz_point',
            'course_completed',
            'challenge_completed',
            'quiz_completed',
            'last_active_at',
        ]
        read_only_fields = [
            'user_id',
            'total_learning_point',
            'total_challenge_point',
            'total_quiz_point',
            'course_completed',
            'challenge_completed',
            'quiz_completed',
            'last_active_at',
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
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'is_active',
            'is_staff',
            'is_superuser',
            'date_joined',
            'last_login',
            'password',
            'role_ids',
            'profile',
            'roles',
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

    def validate_username(self, value):
        user = self.instance
        queryset = User.objects.exclude(pk=getattr(user, 'pk', None))
        if queryset.filter(username__iexact=value).exists():
            raise serializers.ValidationError('A user with that username already exists.')
        return value

    def validate_email(self, value):
        user = self.instance
        if not value:
            return value
        queryset = User.objects.exclude(pk=getattr(user, 'pk', None))
        if queryset.filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with that email already exists.')
        return value

    @staticmethod
    def _default_member_role_ids():
        member_role = Role.objects.filter(name='Member').order_by('id').first()
        if member_role is None:
            return []
        return [member_role.id]

    @staticmethod
    def _sync_roles(user, role_ids):
        from api.services.permission_service import PermissionService

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

    ALLOWED_LANGUAGES = {'vi', 'en'}
    ALLOWED_THEMES = {'system', 'light', 'dark'}

    class Meta:
        model = UserProfile
        fields = ['language', 'theme', 'timezone']

    def validate_language(self, value):
        if value not in self.ALLOWED_LANGUAGES:
            raise serializers.ValidationError(f'language must be one of {sorted(self.ALLOWED_LANGUAGES)}')
        return value

    def validate_theme(self, value):
        if value not in self.ALLOWED_THEMES:
            raise serializers.ValidationError(f'theme must be one of {sorted(self.ALLOWED_THEMES)}')
        return value


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
            'username',
            'entry_year',
            'display_name',
            'avatar_url',
            'bio',
            'location',
            'website',
            'total_learning_point',
            'total_challenge_point',
            'total_quiz_point',
            'course_completed',
            'challenge_completed',
            'quiz_completed',
            'last_active_at',
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
            'id',
            'user',
            'device_info',
            'refresh_token_hash',
            'last_used_at',
            'expires_at',
            'revoked_at',
            'revoked_by',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
