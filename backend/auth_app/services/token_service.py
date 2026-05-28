from datetime import timedelta

from django.core.cache import cache
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from api.services.permission_service import PermissionService
from api.models import UserSession
from auth_app.constants import (
    ADMIN_SECTIONS,
    DEFAULT_REFRESH_RATE_LIMIT_PER_MINUTE,
    DEFAULT_REFRESH_RATE_LIMIT_WINDOW_SECONDS,
    PERM_ADMIN_PORTAL_ACCESS,
    REFRESH_GRACE_WINDOW_SECONDS,
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

    def _build_tokens(self, user, session_id: int) -> dict:
        permissions = self.get_or_refresh_permission_cache(user)
        admin_surface = self._has_admin_surface_access(user)
        admin_sections = self._compute_admin_sections(user)
        refresh = RefreshToken.for_user(user)
        refresh['permissions'] = permissions
        refresh['pv'] = user.permission_version
        refresh['admin_surface'] = admin_surface
        refresh['admin_sections'] = admin_sections
        refresh['session_id'] = session_id

        access = refresh.access_token
        access['permissions'] = permissions
        access['pv'] = user.permission_version
        access['admin_surface'] = admin_surface
        access['admin_sections'] = admin_sections
        access['session_id'] = session_id

        return {
            'access': str(access),
            'refresh': str(refresh),
        }

    def issue_tokens_for_new_session(self, user, device_info: str = '') -> dict:
        """Issue tokens for a brand-new login or register.

        Two-phase create: row → sign with session_id → attach refresh hash.
        Returns dict with access/refresh tokens and the session id.
        """
        session = self.session_service.create_empty_session(user, device_info=device_info)
        tokens = self._build_tokens(user, session.id)
        self.session_service.attach_refresh_token(session, tokens['refresh'])
        return {**tokens, 'session_id': session.id}

    def get_or_refresh_permission_cache(self, user) -> str:
        return PermissionService.get_or_refresh_cache(user)

    def _has_admin_surface_access(self, user) -> bool:
        return bool(user and user.has_permission(PERM_ADMIN_PORTAL_ACCESS))

    def _compute_admin_sections(self, user) -> list:
        if not user or not user.is_authenticated:
            return []
        return [
            section_key
            for section_key, perm_name in ADMIN_SECTIONS.items()
            if user.has_permission(perm_name)
        ]

    def refresh_tokens(self, refresh_token: str, device_info: str = '') -> dict:
        refresh_hash = self.session_service.hash_token(refresh_token)

        # Primary lookup: an active session matching this refresh token.
        session = UserSession.objects.select_related('user', 'replaced_by').filter(
            refresh_token_hash=refresh_hash,
            revoked_at__isnull=True,
        ).first()

        # Grace lookup: a recently-rotated session whose successor is still active.
        # Returning the successor's tokens makes concurrent refresh requests idempotent.
        if session is None:
            grace_cutoff = timezone.now() - timedelta(seconds=REFRESH_GRACE_WINDOW_SECONDS)
            rotated = UserSession.objects.select_related('user', 'replaced_by').filter(
                refresh_token_hash=refresh_hash,
                replaced_at__gte=grace_cutoff,
                replaced_by__isnull=False,
            ).first()
            if rotated is not None and rotated.replaced_by is not None:
                successor = rotated.replaced_by
                if successor.revoked_at is None:
                    user = rotated.user
                    if not user.is_active:
                        raise PermissionError('User account is inactive.')
                    # Re-issue with the same successor session_id so the caller
                    # receives a usable refresh; we keep the successor row.
                    tokens = self._build_tokens(user, successor.id)
                    # Update successor's refresh_token_hash so the new refresh
                    # is the one that will validate next time. This still keeps
                    # the original successor row active.
                    self.session_service.attach_refresh_token(successor, tokens['refresh'])
                    successor.last_used_at = timezone.now()
                    successor.save(update_fields=['last_used_at', 'updated_at'])
                    return {**tokens, 'session_id': successor.id}

            raise RefreshTokenError('Invalid refresh token.')

        now = timezone.now()
        if session.expires_at and session.expires_at <= now:
            raise RefreshTokenError('Refresh token has expired.')

        user = session.user
        if not user.is_active:
            raise PermissionError('User account is inactive.')

        self._check_refresh_rate_limit(user.id)

        # Two-phase rotation: create empty successor → sign with its id → attach hash.
        new_session = self.session_service.create_empty_session(user, device_info=device_info)
        tokens = self._build_tokens(user, new_session.id)
        self.session_service.attach_refresh_token(new_session, tokens['refresh'])

        # Mark old session as rotated + revoked, linking to successor.
        session.revoked_at = now
        session.revoked_by = user
        session.last_used_at = now
        session.replaced_by = new_session
        session.replaced_at = now
        session.save(
            update_fields=[
                'revoked_at',
                'revoked_by',
                'last_used_at',
                'replaced_by',
                'replaced_at',
                'updated_at',
            ]
        )
        self.session_service._invalidate_session_active_cache(session.id)

        return {**tokens, 'session_id': new_session.id}

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
