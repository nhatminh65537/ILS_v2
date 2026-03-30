from django.contrib.auth import get_user_model
from rest_framework import serializers


User = get_user_model()


class RegisterRequestSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(min_length=8, write_only=True)
    email = serializers.EmailField(required=False, allow_blank=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Username already exists.')
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
