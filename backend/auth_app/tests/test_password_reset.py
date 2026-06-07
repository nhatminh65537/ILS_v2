import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.mail import get_connection

from api.models import SystemConfig, UserProfile
from auth_app.constants import DEFAULT_PASSWORD_RESET_MAX_PER_HOUR
from auth_app.services.password_reset_service import PasswordResetService


User = get_user_model()

LOCMEM_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

REQUEST_URL = '/api/auth/password/reset/'
CONFIRM_URL = '/api/auth/password/reset/confirm/'


def _set_config(key, value, value_type=SystemConfig.ConfigType.BOOL):
    SystemConfig.objects.update_or_create(
        key=key,
        defaults={
            'value': value,
            'value_type': value_type,
            'category': 'auth',
            'is_runtime': True,
            'is_editable': True,
        },
    )


@pytest.fixture
def capture_email(monkeypatch):
    """Route EmailService through Django's locmem backend so ``mail.outbox`` fills.

    EmailService builds its connection explicitly (console/SMTP), ignoring the
    ``EMAIL_BACKEND`` setting, so override_settings alone wouldn't capture sends.
    """
    from auth_app.services import email_service

    def _locmem(self, smtp):
        return get_connection(LOCMEM_BACKEND), (smtp or {})

    monkeypatch.setattr(email_service.EmailService, '_build_connection', _locmem)
    mail.outbox = []
    return mail.outbox


@pytest.fixture
def reset_user(db):
    user = User.objects.create_user(
        username='reset_target',
        password='OldPass123!',
        email='reset@test.com',
    )
    UserProfile.objects.create(user=user)
    return user


@pytest.mark.django_db
class TestPasswordResetRequest:
    def test_unknown_email_returns_generic_success_without_sending(self, api_client, capture_email):
        response = api_client.post(REQUEST_URL, {'email': 'nobody@test.com'}, format='json')

        assert response.status_code == 200
        assert 'reset link has been sent' in response.data['detail']
        assert len(capture_email) == 0

    def test_known_email_sends_exactly_one_email_with_same_body(self, api_client, reset_user, capture_email):
        unknown = api_client.post(REQUEST_URL, {'email': 'nobody@test.com'}, format='json')
        known = api_client.post(REQUEST_URL, {'email': reset_user.email}, format='json')

        # Identical body regardless of existence (anti-enumeration).
        assert unknown.data['detail'] == known.data['detail']
        assert known.status_code == 200
        assert len(capture_email) == 1
        assert reset_user.email in capture_email[0].to

    def test_sso_only_user_does_not_receive_email(self, api_client, db, capture_email):
        # SSO users are created with a blank password (see SSO service). That is
        # what the request-view guard must treat as "no local password".
        sso_user = User.objects.create_user(username='sso_user', password=None, email='sso@test.com')
        assert sso_user.password == ''

        response = api_client.post(REQUEST_URL, {'email': sso_user.email}, format='json')

        assert response.status_code == 200
        assert len(capture_email) == 0

    def test_rate_limit_blocks_after_max_per_hour(self, api_client, reset_user, capture_email):
        for _ in range(DEFAULT_PASSWORD_RESET_MAX_PER_HOUR):
            ok = api_client.post(REQUEST_URL, {'email': reset_user.email}, format='json')
            assert ok.status_code == 200

        blocked = api_client.post(REQUEST_URL, {'email': reset_user.email}, format='json')
        assert blocked.status_code == 429

    def test_disabled_flag_returns_403(self, api_client, reset_user):
        _set_config('auth.password_reset_enabled', False)
        response = api_client.post(REQUEST_URL, {'email': reset_user.email}, format='json')
        assert response.status_code == 403


@pytest.mark.django_db
class TestPasswordResetConfirm:
    def test_valid_token_updates_password(self, api_client, reset_user):
        token = PasswordResetService().generate_token(reset_user)

        response = api_client.post(
            CONFIRM_URL, {'token': token, 'new_password': 'BrandNew123!'}, format='json'
        )

        assert response.status_code == 200
        reset_user.refresh_from_db()
        assert reset_user.check_password('BrandNew123!')
        assert not reset_user.check_password('OldPass123!')

    def test_token_is_single_use(self, api_client, reset_user):
        token = PasswordResetService().generate_token(reset_user)

        first = api_client.post(
            CONFIRM_URL, {'token': token, 'new_password': 'BrandNew123!'}, format='json'
        )
        assert first.status_code == 200

        # Reusing the same token after the password changed must fail (one-time use).
        second = api_client.post(
            CONFIRM_URL, {'token': token, 'new_password': 'AnotherNew123!'}, format='json'
        )
        assert second.status_code == 400
        reset_user.refresh_from_db()
        assert reset_user.check_password('BrandNew123!')
        assert not reset_user.check_password('AnotherNew123!')

    def test_token_invalidated_by_other_password_change(self, api_client, reset_user):
        token = PasswordResetService().generate_token(reset_user)

        # Password changes through another path (e.g. change-password or admin reset).
        reset_user.set_password('ChangedElsewhere123!')
        reset_user.save()

        response = api_client.post(
            CONFIRM_URL, {'token': token, 'new_password': 'BrandNew123!'}, format='json'
        )
        assert response.status_code == 400

    def test_expired_token_returns_400(self, api_client, reset_user, monkeypatch):
        token = PasswordResetService().generate_token(reset_user)
        # Force every token to be considered expired (age > max_age, so use -1).
        monkeypatch.setattr(
            'auth_app.services.password_reset_service.PASSWORD_RESET_TOKEN_MAX_AGE_SECONDS', -1
        )

        response = api_client.post(
            CONFIRM_URL, {'token': token, 'new_password': 'BrandNew123!'}, format='json'
        )
        assert response.status_code == 400

    def test_tampered_token_returns_400(self, api_client, reset_user):
        token = PasswordResetService().generate_token(reset_user)
        tampered = token[:-1] + ('A' if token[-1] != 'A' else 'B')

        response = api_client.post(
            CONFIRM_URL, {'token': tampered, 'new_password': 'BrandNew123!'}, format='json'
        )
        assert response.status_code == 400

    def test_confirm_revokes_all_sessions(self, reset_user):
        from auth_app.services.token_service import TokenService
        from rest_framework.test import APIClient

        # Establish a live session and verify it works first.
        tokens = TokenService().issue_tokens_for_new_session(reset_user, device_info='pytest')
        authed = APIClient()
        authed.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        assert authed.get('/api/auth/sessions/').status_code == 200

        token = PasswordResetService().generate_token(reset_user)
        anon = APIClient()
        confirm = anon.post(
            CONFIRM_URL, {'token': token, 'new_password': 'BrandNew123!'}, format='json'
        )
        assert confirm.status_code == 200
        assert confirm.data['revoked_count'] >= 1

        # The previously-valid access token must now be rejected.
        assert authed.get('/api/auth/sessions/').status_code == 401

    def test_policy_violation_returns_400(self, api_client, reset_user):
        _set_config('auth.password.min_length', 12, value_type=SystemConfig.ConfigType.INT)
        token = PasswordResetService().generate_token(reset_user)

        response = api_client.post(
            CONFIRM_URL, {'token': token, 'new_password': 'short1!'}, format='json'
        )
        assert response.status_code == 400

    def test_disabled_flag_returns_403(self, api_client, reset_user):
        _set_config('auth.password_reset_enabled', False)
        token = PasswordResetService().generate_token(reset_user)

        response = api_client.post(
            CONFIRM_URL, {'token': token, 'new_password': 'BrandNew123!'}, format='json'
        )
        assert response.status_code == 403
