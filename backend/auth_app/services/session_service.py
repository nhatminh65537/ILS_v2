import hashlib
from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from api.models import UserSession
from api.utils import get_config
from auth_app.constants import DEFAULT_REFRESH_TTL_MINUTES, REFRESH_TTL_CONFIG_KEY


class SessionService:
    def create_session(self, user, refresh_token: str, device_info: str = '') -> UserSession:
        ttl_minutes = int(get_config(REFRESH_TTL_CONFIG_KEY, DEFAULT_REFRESH_TTL_MINUTES) or DEFAULT_REFRESH_TTL_MINUTES)
        now = timezone.now()
        return UserSession.objects.create(
            user=user,
            device_info=device_info,
            refresh_token_hash=self.hash_token(refresh_token),
            expires_at=now + timedelta(minutes=ttl_minutes),
            last_used_at=now,
        )

    def revoke_session_by_refresh(self, user, refresh_token: str) -> UserSession | None:
        refresh_hash = self.hash_token(refresh_token)
        session = UserSession.objects.filter(
            user=user,
            refresh_token_hash=refresh_hash,
            revoked_at__isnull=True,
        ).first()
        if session is None:
            return None

        now = timezone.now()
        session.revoked_at = now
        session.revoked_by = user
        session.last_used_at = now
        session.save(update_fields=['revoked_at', 'revoked_by', 'last_used_at', 'updated_at'])
        return session

    def revoke_all_user_sessions(self, user) -> int:
        now = timezone.now()
        return UserSession.objects.filter(
            user=user,
            revoked_at__isnull=True,
        ).update(revoked_at=now, revoked_by=user, updated_at=now)

    def list_active_sessions_for_user(self, user):
        now = timezone.now()
        return UserSession.objects.filter(
            user=user,
            revoked_at__isnull=True,
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=now)
        ).order_by('-last_used_at', '-id')

    def revoke_session_by_id_for_user(self, user, session_id: int) -> UserSession | None:
        session = UserSession.objects.filter(
            id=session_id,
            user=user,
            revoked_at__isnull=True,
        ).first()
        if session is None:
            return None

        now = timezone.now()
        session.revoked_at = now
        session.revoked_by = user
        session.last_used_at = now
        session.save(update_fields=['revoked_at', 'revoked_by', 'last_used_at', 'updated_at'])
        return session

    def rotate_session(self, session: UserSession, refresh_token: str, device_info: str = '') -> UserSession:
        now = timezone.now()
        with transaction.atomic():
            session.revoked_at = now
            session.revoked_by = session.user
            session.last_used_at = now
            session.save(update_fields=['revoked_at', 'revoked_by', 'last_used_at', 'updated_at'])
            return self.create_session(user=session.user, refresh_token=refresh_token, device_info=device_info)

    @staticmethod
    def hash_token(raw_token: str) -> str:
        return hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
