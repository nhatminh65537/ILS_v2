from django.core.cache import cache
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from api.services.permission_service import PermissionService
from api.models import UserSession
from auth_app.constants import (
    DEFAULT_REFRESH_RATE_LIMIT_PER_MINUTE,
    DEFAULT_REFRESH_RATE_LIMIT_WINDOW_SECONDS,
    REFRESH_RATE_CACHE_KEY_TEMPLATE,
)
from auth_app.services.session_service import SessionService


class RefreshTokenError(Exception):
    pass


class RefreshRateLimitError(Exception):
    pass


class TokenService:
    def __init__(self):
        self.session_service = SessionService()

    def issue_tokens(self, user) -> dict:
        permissions = self.get_or_refresh_permission_cache(user)
        refresh = RefreshToken.for_user(user)
        refresh['permissions'] = permissions
        refresh['pv'] = user.permission_version

        access = refresh.access_token
        access['permissions'] = permissions
        access['pv'] = user.permission_version

        return {
            'access': str(access),
            'refresh': str(refresh),
        }

    def get_or_refresh_permission_cache(self, user) -> str:
        return PermissionService.get_or_refresh_cache(user)

    def refresh_tokens(self, refresh_token: str, device_info: str = '') -> dict:
        refresh_hash = self.session_service.hash_token(refresh_token)
        session = UserSession.objects.select_related('user').filter(
            refresh_token_hash=refresh_hash,
            revoked_at__isnull=True,
        ).first()

        if session is None:
            raise RefreshTokenError('Invalid refresh token.')

        now = timezone.now()
        if session.expires_at and session.expires_at <= now:
            raise RefreshTokenError('Refresh token has expired.')

        user = session.user
        if not user.is_active:
            raise PermissionError('User account is inactive.')

        self._check_refresh_rate_limit(user.id)

        tokens = self.issue_tokens(user)
        self.session_service.rotate_session(session, tokens['refresh'], device_info=device_info)

        return tokens

    def _check_refresh_rate_limit(self, user_id: int) -> None:
        cache_key = REFRESH_RATE_CACHE_KEY_TEMPLATE.format(user_id=user_id)
        max_requests_per_minute = DEFAULT_REFRESH_RATE_LIMIT_PER_MINUTE
        current = int(cache.get(cache_key, 0))
        if current >= max_requests_per_minute:
            raise RefreshRateLimitError('Too many token refresh requests.')

        if current == 0:
            cache.set(cache_key, 1, timeout=DEFAULT_REFRESH_RATE_LIMIT_WINDOW_SECONDS)
            return

        try:
            cache.incr(cache_key)
        except ValueError:
            cache.set(cache_key, current + 1, timeout=DEFAULT_REFRESH_RATE_LIMIT_WINDOW_SECONDS)
