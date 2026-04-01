from datetime import timedelta

import pytest
from django.utils import timezone

from api.models import UserSession
from auth_app.services.session_service import SessionService


@pytest.mark.django_db
class TestSessionService:
    def test_create_session_hashes_refresh_token(self, member_user):
        service = SessionService()

        session = service.create_session(
            user=member_user,
            refresh_token='refresh-token-1',
            device_info='pytest-device',
        )

        assert session.user_id == member_user.id
        assert session.device_info == 'pytest-device'
        assert session.refresh_token_hash != 'refresh-token-1'
        assert session.revoked_at is None
        assert session.expires_at is not None

    def test_revoke_session_by_refresh_returns_none_for_missing_token(self, member_user):
        service = SessionService()

        session = service.revoke_session_by_refresh(member_user, 'missing-token')

        assert session is None

    def test_revoke_all_user_sessions_revokes_only_active(self, member_user):
        service = SessionService()
        active_1 = service.create_session(member_user, 'token-1')
        active_2 = service.create_session(member_user, 'token-2')
        revoked = service.create_session(member_user, 'token-3')
        revoked.revoked_at = timezone.now() - timedelta(minutes=1)
        revoked.save(update_fields=['revoked_at', 'updated_at'])

        updated_count = service.revoke_all_user_sessions(member_user)

        assert updated_count == 2
        active_1.refresh_from_db()
        active_2.refresh_from_db()
        revoked.refresh_from_db()
        assert active_1.revoked_at is not None
        assert active_2.revoked_at is not None
        assert revoked.revoked_at is not None

    def test_rotate_session_revokes_old_and_creates_new(self, member_user):
        service = SessionService()
        old_session = service.create_session(member_user, 'old-token', device_info='old-device')

        new_session = service.rotate_session(old_session, 'new-token', device_info='new-device')

        old_session.refresh_from_db()
        assert old_session.revoked_at is not None
        assert new_session.id != old_session.id
        assert new_session.user_id == member_user.id
        assert new_session.device_info == 'new-device'
        assert new_session.revoked_at is None

        assert UserSession.objects.filter(user=member_user).count() == 2
