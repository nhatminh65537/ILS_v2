import hashlib
from datetime import timedelta

from django.contrib.auth import authenticate, get_user_model
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Role, UserProfile, UserRole, UserSession
from api.utils import get_config
from auth_app.serializers import (
    AuthTokenResponseSerializer,
    AuthUserSerializer,
    LoginRequestSerializer,
    LogoutRequestSerializer,
    RegisterRequestSerializer,
)
from auth_app.services.token_service import TokenService


User = get_user_model()


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not get_config('auth.registration_enabled', True):
            return Response({'detail': 'Registration is disabled.'}, status=status.HTTP_403_FORBIDDEN)

        if not get_config('auth.local_login_enabled', True):
            return Response({'detail': 'Local login is disabled.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = RegisterRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            user = User.objects.create_user(
                username=serializer.validated_data['username'],
                password=serializer.validated_data['password'],
                email=serializer.validated_data.get('email', ''),
            )
            UserProfile.objects.create(user=user)

            member_role, _ = Role.objects.get_or_create(
                name='Member',
                defaults={'description': 'Default role for registered users', 'is_system': True},
            )
            UserRole.objects.get_or_create(user=user, role=member_role)

            tokens = TokenService().issue_tokens(user)
            _create_session(
                user=user,
                refresh_token=tokens['refresh'],
                device_info=request.META.get('HTTP_USER_AGENT', ''),
            )

        payload = {
            'access': tokens['access'],
            'refresh': tokens['refresh'],
            'user': AuthUserSerializer(user).data,
        }
        return Response(AuthTokenResponseSerializer(payload).data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not get_config('auth.local_login_enabled', True):
            return Response({'detail': 'Local login is disabled.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = LoginRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data['username']
        cache_key = f'login_fail:{username}'
        fail_count = int(cache.get(cache_key, 0))
        if fail_count >= 5:
            return Response({'detail': 'Too many failed attempts.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        user = authenticate(
            username=username,
            password=serializer.validated_data['password'],
        )
        if user is None or not user.is_active:
            cache.set(cache_key, fail_count + 1, timeout=300)
            return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        cache.delete(cache_key)

        tokens = TokenService().issue_tokens(user)
        device_info = serializer.validated_data.get('device_info') or request.META.get('HTTP_USER_AGENT', '')
        _create_session(user=user, refresh_token=tokens['refresh'], device_info=device_info)

        payload = {
            'access': tokens['access'],
            'refresh': tokens['refresh'],
            'user': AuthUserSerializer(user).data,
        }
        return Response(AuthTokenResponseSerializer(payload).data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        refresh_hash = _hash_token(serializer.validated_data['refresh'])
        session = UserSession.objects.filter(
            user=request.user,
            refresh_token_hash=refresh_hash,
            revoked_at__isnull=True,
        ).first()

        if session is None:
            return Response({'detail': 'Session not found.'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        session.revoked_at = now
        session.revoked_by = request.user
        session.last_used_at = now
        session.save(update_fields=['revoked_at', 'revoked_by', 'last_used_at', 'updated_at'])

        return Response({'detail': 'Logged out successfully.'}, status=status.HTTP_200_OK)


class LogoutAllView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        now = timezone.now()
        updated = UserSession.objects.filter(
            user=request.user,
            revoked_at__isnull=True,
        ).update(revoked_at=now, revoked_by=request.user, updated_at=now)

        return Response({'detail': 'Logged out all sessions.', 'revoked_count': updated}, status=status.HTTP_200_OK)


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode('utf-8')).hexdigest()


def _create_session(user, refresh_token: str, device_info: str = '') -> UserSession:
    ttl_minutes = int(get_config('auth.token.refresh_ttl', 60 * 24 * 7) or (60 * 24 * 7))
    expires_at = timezone.now() + timedelta(minutes=ttl_minutes)
    return UserSession.objects.create(
        user=user,
        device_info=device_info,
        refresh_token_hash=_hash_token(refresh_token),
        expires_at=expires_at,
        last_used_at=timezone.now(),
    )
