import hashlib
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken

from api.models import Role, SystemConfig, UserProfile, UserRole, UserSession


User = get_user_model()


def _set_config(key: str, value, value_type=SystemConfig.ConfigType.BOOL, is_runtime=True):
    SystemConfig.objects.update_or_create(
        key=key,
        defaults={
            'value': value,
            'value_type': value_type,
            'category': 'auth',
            'is_runtime': is_runtime,
            'is_editable': True,
        },
    )


def _assign_role(user, role_name: str):
    role, _ = Role.objects.get_or_create(
        name=role_name,
        defaults={'description': f'{role_name} role', 'is_system': True},
    )
    UserRole.objects.get_or_create(user=user, role=role)
    return role


@pytest.fixture(autouse=True)
def clear_login_cache():
    cache.clear()


@pytest.mark.django_db
class TestAuthApp:
    def test_register_success_creates_profile_role_and_session(self, api_client):
        response = api_client.post(
            '/api/auth/register/',
            {
                'username': 'new_member',
                'password': 'StrongPass123!',
                'email': 'new_member@example.com',
            },
            format='json',
        )

        assert response.status_code == 201
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert response.data['user']['username'] == 'new_member'

        user = User.objects.get(username='new_member')
        assert UserProfile.objects.filter(user=user).exists()

        member_role = Role.objects.get(name='Member')
        assert UserRole.objects.filter(user=user, role=member_role).exists()

        session = UserSession.objects.get(user=user)
        assert session.refresh_token_hash != response.data['refresh']
        assert session.refresh_token_hash == hashlib.sha256(response.data['refresh'].encode('utf-8')).hexdigest()

    def test_register_blocked_when_registration_disabled(self, api_client):
        SystemConfig.objects.create(
            key='auth.registration_enabled',
            value=False,
            value_type=SystemConfig.ConfigType.BOOL,
            category='auth',
            is_runtime=True,
            is_editable=True,
        )

        response = api_client.post(
            '/api/auth/register/',
            {
                'username': 'blocked_user',
                'password': 'StrongPass123!',
            },
            format='json',
        )

        assert response.status_code == 403

    def test_login_success_and_session_created(self, api_client, member_user):
        response = api_client.post(
            '/api/auth/login/',
            {
                'username': member_user.username,
                'password': 'MemberPass123!',
                'device_info': 'pytest-device',
            },
            format='json',
        )

        assert response.status_code == 200
        assert response.data['user']['username'] == member_user.username

        session = UserSession.objects.filter(user=member_user).latest('id')
        assert session.device_info == 'pytest-device'
        assert session.refresh_token_hash == hashlib.sha256(response.data['refresh'].encode('utf-8')).hexdigest()

    def test_login_member_token_does_not_grant_admin_surface(self, api_client, member_user):
        response = api_client.post(
            '/api/auth/login/',
            {
                'username': member_user.username,
                'password': 'MemberPass123!',
            },
            format='json',
        )

        assert response.status_code == 200

        access = AccessToken(response.data['access'])
        assert access['admin_surface'] is False

    def test_login_editor_token_grants_admin_surface(self, api_client, editor_user):
        _assign_role(editor_user, 'Editor')

        response = api_client.post(
            '/api/auth/login/',
            {
                'username': editor_user.username,
                'password': 'EditorPass123!',
            },
            format='json',
        )

        assert response.status_code == 200

        access = AccessToken(response.data['access'])
        assert access['admin_surface'] is True

    def test_login_rate_limit_after_five_failures(self, api_client, member_user):
        for _ in range(5):
            bad = api_client.post(
                '/api/auth/login/',
                {
                    'username': member_user.username,
                    'password': 'WrongPass!',
                },
                format='json',
            )
            assert bad.status_code == 401

        blocked = api_client.post(
            '/api/auth/login/',
            {
                'username': member_user.username,
                'password': 'WrongPass!',
            },
            format='json',
        )

        assert blocked.status_code == 429

    def test_logout_revokes_exact_session(self, api_client, member_user):
        login = api_client.post(
            '/api/auth/login/',
            {
                'username': member_user.username,
                'password': 'MemberPass123!',
            },
            format='json',
        )
        refresh = login.data['refresh']
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        logout = api_client.post('/api/auth/logout/', {'refresh': refresh}, format='json')
        assert logout.status_code == 200

        token_hash = hashlib.sha256(refresh.encode('utf-8')).hexdigest()
        session = UserSession.objects.get(user=member_user, refresh_token_hash=token_hash)
        assert session.revoked_at is not None

    def test_logout_all_revokes_all_active_sessions(self, api_client, member_user):
        login1 = api_client.post(
            '/api/auth/login/',
            {
                'username': member_user.username,
                'password': 'MemberPass123!',
                'device_info': 'device-1',
            },
            format='json',
        )
        login2 = api_client.post(
            '/api/auth/login/',
            {
                'username': member_user.username,
                'password': 'MemberPass123!',
                'device_info': 'device-2',
            },
            format='json',
        )

        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login1.data['access']}")
        response = api_client.post('/api/auth/logout-all/', {}, format='json')

        assert response.status_code == 200
        assert response.data['revoked_count'] >= 2
        assert UserSession.objects.filter(user=member_user, revoked_at__isnull=True).count() == 0

    def test_password_change_success_updates_password_and_revokes_all_sessions(self, api_client, member_user):
        login = api_client.post(
            '/api/auth/login/',
            {
                'username': member_user.username,
                'password': 'MemberPass123!',
                'device_info': 'password-change-device',
            },
            format='json',
        )
        refresh = login.data['refresh']
        token_hash = hashlib.sha256(refresh.encode('utf-8')).hexdigest()

        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        response = api_client.post(
            '/api/auth/password/change/',
            {
                'current_password': 'MemberPass123!',
                'new_password': 'NewMemberPass123!',
            },
            format='json',
        )

        assert response.status_code == 200
        assert response.data['revoked_count'] >= 1

        member_user.refresh_from_db()
        assert member_user.check_password('NewMemberPass123!') is True

        session = UserSession.objects.get(user=member_user, refresh_token_hash=token_hash)
        assert session.revoked_at is not None
        assert UserSession.objects.filter(user=member_user, revoked_at__isnull=True).count() == 0

        refresh_after_change = api_client.post('/api/auth/token/refresh/', {'refresh': refresh}, format='json')
        assert refresh_after_change.status_code == 401

    def test_password_change_rejects_invalid_current_password(self, api_client, member_user):
        login = api_client.post(
            '/api/auth/login/',
            {
                'username': member_user.username,
                'password': 'MemberPass123!',
            },
            format='json',
        )

        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        response = api_client.post(
            '/api/auth/password/change/',
            {
                'current_password': 'WrongCurrentPass!',
                'new_password': 'NewMemberPass123!',
            },
            format='json',
        )

        assert response.status_code == 401
        member_user.refresh_from_db()
        assert member_user.check_password('MemberPass123!') is True

    def test_password_change_enforces_runtime_password_policy(self, api_client, member_user):
        _set_config('auth.password.min_length', 12, value_type=SystemConfig.ConfigType.INT)
        _set_config('auth.password.require_uppercase', True)
        _set_config('auth.password.require_number', True)
        _set_config('auth.password.require_special', True)

        login = api_client.post(
            '/api/auth/login/',
            {
                'username': member_user.username,
                'password': 'MemberPass123!',
            },
            format='json',
        )
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        response = api_client.post(
            '/api/auth/password/change/',
            {
                'current_password': 'MemberPass123!',
                'new_password': 'alllowercase123',
            },
            format='json',
        )

        assert response.status_code == 400
        assert 'new_password' in response.data

    def test_sessions_list_returns_only_active_sessions_for_authenticated_user(self, api_client, member_user, editor_user):
        member_login = api_client.post(
            '/api/auth/login/',
            {
                'username': member_user.username,
                'password': 'MemberPass123!',
                'device_info': 'member-active',
            },
            format='json',
        )
        member_refresh_hash = hashlib.sha256(member_login.data['refresh'].encode('utf-8')).hexdigest()
        active_member_session = UserSession.objects.get(user=member_user, refresh_token_hash=member_refresh_hash)

        revoked_login = api_client.post(
            '/api/auth/login/',
            {
                'username': member_user.username,
                'password': 'MemberPass123!',
                'device_info': 'member-revoked',
            },
            format='json',
        )
        revoked_hash = hashlib.sha256(revoked_login.data['refresh'].encode('utf-8')).hexdigest()
        UserSession.objects.filter(user=member_user, refresh_token_hash=revoked_hash).update(
            revoked_at=timezone.now(),
            revoked_by=member_user,
        )

        UserSession.objects.create(
            user=member_user,
            device_info='member-expired',
            refresh_token_hash='expired-session-hash',
            last_used_at=timezone.now() - timedelta(days=1),
            expires_at=timezone.now() - timedelta(minutes=1),
        )

        api_client.post(
            '/api/auth/login/',
            {
                'username': editor_user.username,
                'password': 'EditorPass123!',
                'device_info': 'editor-active',
            },
            format='json',
        )

        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {member_login.data['access']}")
        response = api_client.get('/api/auth/sessions/')

        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]['id'] == active_member_session.id
        assert set(response.data[0].keys()) == {'id', 'device_info', 'last_used_at', 'expires_at', 'created_at'}

    def test_session_revoke_by_id_revokes_owned_session(self, api_client, member_user):
        auth_login = api_client.post(
            '/api/auth/login/',
            {
                'username': member_user.username,
                'password': 'MemberPass123!',
                'device_info': 'auth-session',
            },
            format='json',
        )

        target_login = api_client.post(
            '/api/auth/login/',
            {
                'username': member_user.username,
                'password': 'MemberPass123!',
                'device_info': 'target-session',
            },
            format='json',
        )
        target_hash = hashlib.sha256(target_login.data['refresh'].encode('utf-8')).hexdigest()
        target_session = UserSession.objects.get(user=member_user, refresh_token_hash=target_hash)

        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {auth_login.data['access']}")
        response = api_client.delete(f'/api/auth/sessions/{target_session.id}/')

        assert response.status_code == 204

        target_session.refresh_from_db()
        assert target_session.revoked_at is not None
        assert target_session.revoked_by_id == member_user.id

        sessions_response = api_client.get('/api/auth/sessions/')
        listed_ids = {item['id'] for item in sessions_response.data}
        assert target_session.id not in listed_ids

    def test_session_revoke_by_id_returns_404_for_other_user_session(self, api_client, member_user, editor_user):
        editor_login = api_client.post(
            '/api/auth/login/',
            {
                'username': editor_user.username,
                'password': 'EditorPass123!',
                'device_info': 'editor-session',
            },
            format='json',
        )
        editor_hash = hashlib.sha256(editor_login.data['refresh'].encode('utf-8')).hexdigest()
        editor_session = UserSession.objects.get(user=editor_user, refresh_token_hash=editor_hash)

        member_login = api_client.post(
            '/api/auth/login/',
            {
                'username': member_user.username,
                'password': 'MemberPass123!',
            },
            format='json',
        )
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {member_login.data['access']}")

        response = api_client.delete(f'/api/auth/sessions/{editor_session.id}/')
        assert response.status_code == 404

        editor_session.refresh_from_db()
        assert editor_session.revoked_at is None

    def test_token_refresh_success_rotates_session(self, api_client, member_user):
        login = api_client.post(
            '/api/auth/login/',
            {
                'username': member_user.username,
                'password': 'MemberPass123!',
                'device_info': 'initial-device',
            },
            format='json',
        )
        old_refresh = login.data['refresh']
        old_hash = hashlib.sha256(old_refresh.encode('utf-8')).hexdigest()

        refreshed = api_client.post(
            '/api/auth/token/refresh/',
            {
                'refresh': old_refresh,
                'device_info': 'refreshed-device',
            },
            format='json',
        )

        assert refreshed.status_code == 200
        assert refreshed.data['refresh'] != old_refresh

        old_session = UserSession.objects.get(user=member_user, refresh_token_hash=old_hash)
        assert old_session.revoked_at is not None

        new_hash = hashlib.sha256(refreshed.data['refresh'].encode('utf-8')).hexdigest()
        new_session = UserSession.objects.get(user=member_user, refresh_token_hash=new_hash)
        assert new_session.revoked_at is None
        assert new_session.device_info == 'refreshed-device'

    def test_token_refresh_invalid_token_returns_401(self, api_client):
        response = api_client.post(
            '/api/auth/token/refresh/',
            {'refresh': 'invalid.refresh.token'},
            format='json',
        )

        assert response.status_code == 401

    def test_token_refresh_revoked_session_returns_401(self, api_client, member_user):
        login = api_client.post(
            '/api/auth/login/',
            {
                'username': member_user.username,
                'password': 'MemberPass123!',
            },
            format='json',
        )
        refresh = login.data['refresh']
        token_hash = hashlib.sha256(refresh.encode('utf-8')).hexdigest()
        UserSession.objects.filter(user=member_user, refresh_token_hash=token_hash).update(
            revoked_at=timezone.now(),
            revoked_by=member_user,
        )

        response = api_client.post('/api/auth/token/refresh/', {'refresh': refresh}, format='json')
        assert response.status_code == 401

    def test_token_refresh_expired_session_returns_401(self, api_client, member_user):
        login = api_client.post(
            '/api/auth/login/',
            {
                'username': member_user.username,
                'password': 'MemberPass123!',
            },
            format='json',
        )
        refresh = login.data['refresh']
        token_hash = hashlib.sha256(refresh.encode('utf-8')).hexdigest()
        UserSession.objects.filter(user=member_user, refresh_token_hash=token_hash).update(
            expires_at=timezone.now() - timedelta(minutes=1)
        )

        response = api_client.post('/api/auth/token/refresh/', {'refresh': refresh}, format='json')
        assert response.status_code == 401

    def test_token_refresh_inactive_user_returns_403(self, api_client, member_user):
        login = api_client.post(
            '/api/auth/login/',
            {
                'username': member_user.username,
                'password': 'MemberPass123!',
            },
            format='json',
        )
        refresh = login.data['refresh']
        member_user.is_active = False
        member_user.save(update_fields=['is_active'])

        response = api_client.post('/api/auth/token/refresh/', {'refresh': refresh}, format='json')
        assert response.status_code == 403

    def test_token_refresh_old_token_invalid_after_rotation(self, api_client, member_user):
        # Within the grace window the old refresh token is honoured (returns
        # the successor's tokens) so concurrent refresh requests can't
        # accidentally log the user out (bug A-06). After the window it must
        # be rejected.
        from datetime import timedelta
        from django.utils import timezone

        from api.models import UserSession
        from auth_app.constants import REFRESH_GRACE_WINDOW_SECONDS

        login = api_client.post(
            '/api/auth/login/',
            {
                'username': member_user.username,
                'password': 'MemberPass123!',
            },
            format='json',
        )
        old_refresh = login.data['refresh']

        first_refresh = api_client.post('/api/auth/token/refresh/', {'refresh': old_refresh}, format='json')
        assert first_refresh.status_code == 200

        grace_reuse = api_client.post('/api/auth/token/refresh/', {'refresh': old_refresh}, format='json')
        assert grace_reuse.status_code == 200

        past = timezone.now() - timedelta(seconds=REFRESH_GRACE_WINDOW_SECONDS + 5)
        UserSession.objects.filter(replaced_at__isnull=False).update(replaced_at=past)

        reused = api_client.post('/api/auth/token/refresh/', {'refresh': old_refresh}, format='json')
        assert reused.status_code == 401

    def test_token_refresh_includes_permission_claims(self, api_client, member_user):
        import base64

        login = api_client.post(
            '/api/auth/login/',
            {
                'username': member_user.username,
                'password': 'MemberPass123!',
            },
            format='json',
        )

        refreshed = api_client.post(
            '/api/auth/token/refresh/',
            {'refresh': login.data['refresh']},
            format='json',
        )
        assert refreshed.status_code == 200

        access = AccessToken(refreshed.data['access'])
        assert 'permissions' in access
        decoded = base64.b64decode(access['permissions'])
        assert len(decoded) == 32
        assert 'pv' in access
        assert access['pv'] == member_user.permission_version
        assert access['admin_surface'] is False
        assert 'permission_version' not in access

    def test_token_refresh_rate_limit_after_ten_requests_per_minute(self, api_client, member_user):
        login = api_client.post(
            '/api/auth/login/',
            {
                'username': member_user.username,
                'password': 'MemberPass123!',
            },
            format='json',
        )
        current_refresh = login.data['refresh']

        for _ in range(10):
            refreshed = api_client.post('/api/auth/token/refresh/', {'refresh': current_refresh}, format='json')
            assert refreshed.status_code == 200
            current_refresh = refreshed.data['refresh']

        blocked = api_client.post('/api/auth/token/refresh/', {'refresh': current_refresh}, format='json')
        assert blocked.status_code == 429

    def test_token_refresh_then_logout_all_revokes_latest_session(self, api_client, member_user):
        login = api_client.post(
            '/api/auth/login/',
            {
                'username': member_user.username,
                'password': 'MemberPass123!',
            },
            format='json',
        )
        refresh_response = api_client.post(
            '/api/auth/token/refresh/',
            {'refresh': login.data['refresh']},
            format='json',
        )
        assert refresh_response.status_code == 200

        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh_response.data['access']}")
        logout_all = api_client.post('/api/auth/logout-all/', {}, format='json')
        assert logout_all.status_code == 200

        retry = api_client.post(
            '/api/auth/token/refresh/',
            {'refresh': refresh_response.data['refresh']},
            format='json',
        )
        assert retry.status_code == 401

