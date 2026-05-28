"""Custom JWT authentication that honours UserSession revocation.

Stock SimpleJWT validates only the token signature/expiry. Because we track
multi-device sessions in `UserSession` and let users revoke them (logout,
logout-all, password change), we must additionally check that the session
referenced by the access token is still active on every request — otherwise
revoked sessions keep working until the access token naturally expires.

The token carries the originating `session_id` claim (set in
`TokenService._build_tokens`). We cache the active flag for
`SESSION_ACTIVE_CACHE_TTL_SECONDS` to keep this hot path cheap; the cache is
invalidated by `SessionService` whenever a session is revoked, so the worst
case lag is one TTL window for revocations that bypass the service layer.
"""

from django.core.cache import cache
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed

from api.models import UserSession
from auth_app.constants import (
    SESSION_ACTIVE_CACHE_KEY_TEMPLATE,
    SESSION_ACTIVE_CACHE_TTL_SECONDS,
)


class RevocationCheckingJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)

        session_id = validated_token.get('session_id')
        if session_id is None:
            # Legacy tokens (issued before the session_id claim existed) are
            # accepted to avoid mass logout on deployment of this change.
            # New logins will start including the claim immediately.
            return user

        cache_key = SESSION_ACTIVE_CACHE_KEY_TEMPLATE.format(session_id=session_id)
        cached = cache.get(cache_key)
        if cached is True:
            return user
        if cached is False:
            raise AuthenticationFailed('Session has been revoked.', code='session_revoked')

        is_active = UserSession.objects.filter(
            id=session_id,
            revoked_at__isnull=True,
        ).exists()
        cache.set(cache_key, is_active, timeout=SESSION_ACTIVE_CACHE_TTL_SECONDS)
        if not is_active:
            raise AuthenticationFailed('Session has been revoked.', code='session_revoked')

        return user
