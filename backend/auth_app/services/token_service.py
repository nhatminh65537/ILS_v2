import hashlib
from datetime import timedelta

from django.core.cache import cache
from django.db import transaction
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from api.services.permission_service import PermissionService
from api.models import UserSession
from api.utils import get_config


class RefreshTokenError(Exception):
    pass


class RefreshRateLimitError(Exception):
    pass


class TokenService:
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
        refresh_hash = self._hash_token(refresh_token)
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

        with transaction.atomic():
            session.revoked_at = now
            session.revoked_by = user
            session.last_used_at = now
            session.save(update_fields=['revoked_at', 'revoked_by', 'last_used_at', 'updated_at'])

            tokens = self.issue_tokens(user)
            self._create_session(user=user, refresh_token=tokens['refresh'], device_info=device_info)

        return tokens

    def _check_refresh_rate_limit(self, user_id: int) -> None:
        cache_key = f'refresh_rate:{user_id}'
        max_requests_per_minute = 10
        current = int(cache.get(cache_key, 0))
        if current >= max_requests_per_minute:
            raise RefreshRateLimitError('Too many token refresh requests.')

        if current == 0:
            cache.set(cache_key, 1, timeout=60)
            return

        try:
            cache.incr(cache_key)
        except ValueError:
            cache.set(cache_key, current + 1, timeout=60)

    def _create_session(self, user, refresh_token: str, device_info: str = '') -> UserSession:
        ttl_minutes = int(get_config('auth.token.refresh_ttl', 60 * 24 * 7) or (60 * 24 * 7))
        now = timezone.now()
        return UserSession.objects.create(
            user=user,
            device_info=device_info,
            refresh_token_hash=self._hash_token(refresh_token),
            expires_at=now + timedelta(minutes=ttl_minutes),
            last_used_at=now,
        )

    @staticmethod
    def _hash_token(raw_token: str) -> str:
        return hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
