from django.contrib.auth import get_user_model
from rest_framework import exceptions
from rest_framework import serializers

from api.models import UserSession
from auth_app.validators import validate_password_policy


User = get_user_model()


class RegisterRequestSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(min_length=8, write_only=True)
    email = serializers.EmailField(required=False, allow_blank=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Username already exists.')
        return value

    def validate_email(self, value):
        if value and User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Email already exists.')
        return value


class LoginRequestSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)
    device_info = serializers.CharField(required=False, allow_blank=True)


class LogoutRequestSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class TokenRefreshRequestSerializer(serializers.Serializer):
    refresh = serializers.CharField()
    device_info = serializers.CharField(required=False, allow_blank=True)


class TokenRefreshResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()


class SSOCallbackQuerySerializer(serializers.Serializer):
    code = serializers.CharField()
    state = serializers.CharField()


class IdentityLinkRequestSerializer(serializers.Serializer):
    provider = serializers.ChoiceField(
        choices=['authentik', 'google', 'github'],
        required=False,
        default='authentik',
    )
    external_id = serializers.CharField()
    email = serializers.EmailField(required=False, allow_blank=True)
    name = serializers.CharField(required=False, allow_blank=True)
    extra_data = serializers.JSONField(required=False)


class AuthUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email')


class AuthTokenResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = AuthUserSerializer()


class PasswordChangeRequestSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user is None or not user.is_authenticated:
            raise exceptions.NotAuthenticated('Authentication required.')

        if not user.check_password(value):
            raise exceptions.AuthenticationFailed('Current password is incorrect.')
        return value

    def validate_new_password(self, value):
        return validate_password_policy(value)

    def validate(self, attrs):
        if attrs['new_password'] == attrs['current_password']:
            raise serializers.ValidationError({'new_password': 'New password must be different from current password.'})
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        return validate_password_policy(value)


class SessionListItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSession
        fields = ('id', 'device_info', 'last_used_at', 'expires_at', 'created_at')
