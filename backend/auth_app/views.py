from django.contrib.auth import authenticate, get_user_model
from django.core.cache import cache
from django.db import transaction
from django.http import HttpResponseRedirect
from django.urls import reverse
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Role, UserProfile, UserRole
from api.utils import get_config
from auth_app.constants import (
    BUILTIN_ROLE_MEMBER,
    DEFAULT_LOGIN_FAILURE_TTL_SECONDS,
    DEFAULT_LOGIN_MAX_FAILURES,
    DEFAULT_PASSWORD_RESET_MAX_PER_HOUR,
    DEFAULT_PASSWORD_RESET_WINDOW_SECONDS,
    LOGIN_FAIL_CACHE_KEY_TEMPLATE,
    PASSWORD_RESET_CACHE_KEY_TEMPLATE,
)
from auth_app.serializers import (
    AuthTokenResponseSerializer,
    AuthUserSerializer,
    IdentityLinkRequestSerializer,
    LoginRequestSerializer,
    LogoutRequestSerializer,
    PasswordChangeRequestSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterRequestSerializer,
    SessionListItemSerializer,
    SSOCallbackQuerySerializer,
    TokenRefreshRequestSerializer,
    TokenRefreshResponseSerializer,
)
from auth_app.services.email_service import EmailService
from auth_app.services.password_reset_service import PasswordResetService
from auth_app.services.session_service import SessionService
from auth_app.services.sso_service import AuthentikSSOService, SSOAuthError, SSOConfigError, SSOLinkError
from auth_app.services.token_service import RefreshRateLimitError, RefreshTokenError, TokenService


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
                name=BUILTIN_ROLE_MEMBER,
                defaults={'description': 'Default role for registered users', 'is_system': True},
            )
            UserRole.objects.get_or_create(user=user, role=member_role)

            tokens = TokenService().issue_tokens_for_new_session(
                user,
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
        cache_key = LOGIN_FAIL_CACHE_KEY_TEMPLATE.format(username=username)
        fail_count = int(cache.get(cache_key, 0))
        if fail_count >= DEFAULT_LOGIN_MAX_FAILURES:
            return Response({'detail': 'Too many failed attempts.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        user = authenticate(
            username=username,
            password=serializer.validated_data['password'],
        )
        if user is None or not user.is_active:
            # Fixed-window counter: first fail sets the TTL, later fails only
            # increment without resetting the window.
            if not cache.add(cache_key, 1, timeout=DEFAULT_LOGIN_FAILURE_TTL_SECONDS):
                try:
                    cache.incr(cache_key)
                except ValueError:
                    cache.set(cache_key, fail_count + 1, timeout=DEFAULT_LOGIN_FAILURE_TTL_SECONDS)
            return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        cache.delete(cache_key)

        device_info = serializer.validated_data.get('device_info') or request.META.get('HTTP_USER_AGENT', '')
        tokens = TokenService().issue_tokens_for_new_session(user, device_info=device_info)

        payload = {
            'access': tokens['access'],
            'refresh': tokens['refresh'],
            'user': AuthUserSerializer(user).data,
        }
        return Response(AuthTokenResponseSerializer(payload).data, status=status.HTTP_200_OK)


class TokenRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = TokenRefreshRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        device_info = serializer.validated_data.get('device_info') or request.META.get('HTTP_USER_AGENT', '')

        try:
            tokens = TokenService().refresh_tokens(
                refresh_token=serializer.validated_data['refresh'],
                device_info=device_info,
            )
        except RefreshRateLimitError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        except PermissionError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except RefreshTokenError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_401_UNAUTHORIZED)

        payload = {'access': tokens['access'], 'refresh': tokens['refresh']}
        return Response(TokenRefreshResponseSerializer(payload).data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session = SessionService().revoke_session_by_refresh(
            user=request.user,
            refresh_token=serializer.validated_data['refresh'],
        )

        if session is None:
            return Response({'detail': 'Session not found.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'detail': 'Logged out successfully.'}, status=status.HTTP_200_OK)


class LogoutAllView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        updated = SessionService().revoke_all_user_sessions(request.user)

        return Response({'detail': 'Logged out all sessions.', 'revoked_count': updated}, status=status.HTTP_200_OK)


class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeRequestSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        revoked_count = SessionService().revoke_all_user_sessions(request.user)

        return Response(
            {'detail': 'Password changed successfully.', 'revoked_count': revoked_count},
            status=status.HTTP_200_OK,
        )


# Generic, fixed message for the reset-request endpoint. Returned regardless of
# whether the email maps to a real account (anti-enumeration).
PASSWORD_RESET_REQUEST_DETAIL = 'If an account with that email exists, a reset link has been sent.'


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not get_config('auth.password_reset_enabled', True):
            return Response({'detail': 'Password reset is disabled.'}, status=status.HTTP_403_FORBIDDEN)

        if not get_config('auth.local_login_enabled', True):
            return Response({'detail': 'Local login is disabled.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email'].lower()

        # Rate-limit per email BEFORE the user lookup so the limiter itself can't
        # be used as an existence oracle. Fixed-window counter mirrors LoginView.
        cache_key = PASSWORD_RESET_CACHE_KEY_TEMPLATE.format(email=email)
        attempt_count = int(cache.get(cache_key, 0))
        if attempt_count >= DEFAULT_PASSWORD_RESET_MAX_PER_HOUR:
            return Response({'detail': 'Too many reset requests.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        if not cache.add(cache_key, 1, timeout=DEFAULT_PASSWORD_RESET_WINDOW_SECONDS):
            try:
                cache.incr(cache_key)
            except ValueError:
                cache.set(cache_key, attempt_count + 1, timeout=DEFAULT_PASSWORD_RESET_WINDOW_SECONDS)

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        # Skip SSO-only accounts — sending a reset link would silently convert
        # them into local-login accounts. Note: SSO users are created with an
        # empty-string password (see SSO service / UserManager.create_user),
        # which Django still reports as "usable", so we check it's non-blank too.
        if user is not None and user.has_usable_password() and user.password:
            reset_service = PasswordResetService()
            token = reset_service.generate_token(user)
            reset_link = reset_service.build_reset_link(token)
            EmailService().send_password_reset_email(user, reset_link)

        return Response({'detail': PASSWORD_RESET_REQUEST_DETAIL}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not get_config('auth.password_reset_enabled', True):
            return Response({'detail': 'Password reset is disabled.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = PasswordResetService().verify_token(serializer.validated_data['token'])
        if user is None:
            return Response(
                {'detail': 'Reset link is invalid or has expired.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save()
        revoked_count = SessionService().revoke_all_user_sessions(user)

        return Response(
            {'detail': 'Password has been reset successfully.', 'revoked_count': revoked_count},
            status=status.HTTP_200_OK,
        )


class SessionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = SessionService().list_active_sessions_for_user(request.user)
        serializer = SessionListItemSerializer(sessions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SessionRevokeView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, session_id: int):
        revoked_session = SessionService().revoke_session_by_id_for_user(request.user, session_id)
        if revoked_session is None:
            return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(status=status.HTTP_204_NO_CONTENT)


class SSORedirectView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not get_config('auth.sso_enabled', False):
            return Response({'detail': 'SSO is disabled.'}, status=status.HTTP_403_FORBIDDEN)

        callback_url = request.build_absolute_uri(reverse('auth-sso-callback'))
        try:
            redirect_payload = AuthentikSSOService().get_redirect_url(callback_url=callback_url)
        except SSOConfigError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except SSOAuthError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_401_UNAUTHORIZED)

        return HttpResponseRedirect(redirect_payload['url'])


class SSOCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not get_config('auth.sso_enabled', False):
            return Response({'detail': 'SSO is disabled.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = SSOCallbackQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        callback_url = request.build_absolute_uri(reverse('auth-sso-callback'))
        try:
            auth_result = AuthentikSSOService().handle_callback(
                code=serializer.validated_data['code'],
                state=serializer.validated_data['state'],
                callback_url=callback_url,
                device_info=request.META.get('HTTP_USER_AGENT', ''),
            )
        except SSOConfigError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except SSOLinkError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)
        except SSOAuthError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_401_UNAUTHORIZED)

        payload = {
            'access': auth_result['access'],
            'refresh': auth_result['refresh'],
            'user': AuthUserSerializer(auth_result['user']).data,
        }
        return Response(AuthTokenResponseSerializer(payload).data, status=status.HTTP_200_OK)


class IdentityLinkView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not get_config('auth.link_accounts_enabled', True):
            return Response({'detail': 'Account linking is disabled.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = IdentityLinkRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            identity, created = AuthentikSSOService().link_identity(
                user=request.user,
                provider=serializer.validated_data.get('provider', 'authentik'),
                external_id=serializer.validated_data['external_id'],
                email=serializer.validated_data.get('email', ''),
                name=serializer.validated_data.get('name', ''),
                extra_data=serializer.validated_data.get('extra_data') or {},
            )
        except SSOConfigError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except SSOLinkError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)

        detail = 'Identity linked successfully.' if created else 'Identity already linked.'
        return Response(
            {
                'detail': detail,
                'provider': identity.provider,
                'external_id': identity.external_id,
                'created': created,
            },
            status=status.HTTP_200_OK,
        )
