import hashlib
from datetime import timedelta
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken

from api.models import Permission, Role, RolePermission, SystemConfig, UserAuthProvider, UserProfile, UserRole, UserSession
from auth_app.services.permission_discovery import discover_permissions


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


def _enable_sso():
    _set_config('auth.sso_enabled', True)
    _set_config('auth.link_accounts_enabled', True)
    _set_config('auth.sso_base_url', 'https://auth.example.com', value_type=SystemConfig.ConfigType.STRING, is_runtime=False)
    _set_config('auth.sso_client_id', 'ils-app', value_type=SystemConfig.ConfigType.STRING, is_runtime=False)
    _set_config('auth.sso_client_secret', 'super-secret', value_type=SystemConfig.ConfigType.SECRET, is_runtime=False)


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

    @patch('auth_app.services.sso_service.AuthentikSSOService._exchange_code')
    @patch('auth_app.services.sso_service.AuthentikSSOService.oidc_discovery')
    def test_sso_redirect_returns_oidc_authorization_redirect(self, mock_discovery, mock_exchange, api_client):
        _enable_sso()
        mock_discovery.return_value = {
            'authorization_endpoint': 'https://auth.example.com/application/o/authorize/',
            'token_endpoint': 'https://auth.example.com/application/o/token/',
        }
        mock_exchange.return_value = {}

        response = api_client.get('/api/auth/sso/redirect/')

        assert response.status_code == 302
        location = response['Location']
        parsed = urlparse(location)
        query = parse_qs(parsed.query)
        assert query['client_id'][0] == 'ils-app'
        assert query['response_type'][0] == 'code'
        assert query['scope'][0] == 'openid profile email'
        assert 'state' in query
        assert 'nonce' in query
        assert cache.get(f"sso:state:{query['state'][0]}") is not None

    @patch('auth_app.services.sso_service.AuthentikSSOService._decode_id_token')
    @patch('auth_app.services.sso_service.AuthentikSSOService._exchange_code')
    @patch('auth_app.services.sso_service.AuthentikSSOService.oidc_discovery')
    def test_sso_callback_creates_new_user_and_identity(self, mock_discovery, mock_exchange, mock_decode, api_client):
        _enable_sso()
        mock_discovery.return_value = {
            'authorization_endpoint': 'https://auth.example.com/application/o/authorize/',
            'token_endpoint': 'https://auth.example.com/application/o/token/',
        }
        mock_exchange.return_value = {'id_token': 'fake-id-token'}

        redirect = api_client.get('/api/auth/sso/redirect/')
        state = parse_qs(urlparse(redirect['Location']).query)['state'][0]
        nonce = cache.get(f'sso:state:{state}')['nonce']

        mock_decode.return_value = {
            'sub': 'auth-sub-new-001',
            'email': 'new_sso_user@example.com',
            'name': 'New SSO User',
            'nonce': nonce,
        }

        response = api_client.get('/api/auth/sso/callback/', {'code': 'auth-code', 'state': state})

        assert response.status_code == 200
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert response.data['user']['email'] == 'new_sso_user@example.com'
        user = User.objects.get(email='new_sso_user@example.com')
        assert UserProfile.objects.filter(user=user).exists()
        assert UserAuthProvider.objects.filter(
            user=user,
            provider='authentik',
            external_id='auth-sub-new-001',
        ).exists()
        assert UserSession.objects.filter(user=user).exists()

    @patch('auth_app.services.sso_service.AuthentikSSOService._decode_id_token')
    @patch('auth_app.services.sso_service.AuthentikSSOService._exchange_code')
    @patch('auth_app.services.sso_service.AuthentikSSOService.oidc_discovery')
    def test_sso_callback_links_existing_local_user_by_email(self, mock_discovery, mock_exchange, mock_decode, api_client, member_user):
        _enable_sso()
        mock_discovery.return_value = {
            'authorization_endpoint': 'https://auth.example.com/application/o/authorize/',
            'token_endpoint': 'https://auth.example.com/application/o/token/',
        }
        mock_exchange.return_value = {'id_token': 'fake-id-token'}

        redirect = api_client.get('/api/auth/sso/redirect/')
        state = parse_qs(urlparse(redirect['Location']).query)['state'][0]
        nonce = cache.get(f'sso:state:{state}')['nonce']

        mock_decode.return_value = {
            'sub': 'auth-sub-linked-001',
            'email': member_user.email,
            'name': 'Linked User',
            'nonce': nonce,
        }

        response = api_client.get('/api/auth/sso/callback/', {'code': 'auth-code', 'state': state})

        assert response.status_code == 200
        assert response.data['user']['id'] == member_user.id
        assert UserAuthProvider.objects.filter(
            user=member_user,
            provider='authentik',
            external_id='auth-sub-linked-001',
        ).exists()

    @patch('auth_app.services.sso_service.AuthentikSSOService._decode_id_token')
    @patch('auth_app.services.sso_service.AuthentikSSOService._exchange_code')
    @patch('auth_app.services.sso_service.AuthentikSSOService.oidc_discovery')
    def test_sso_callback_rejects_invalid_state(self, mock_discovery, mock_exchange, mock_decode, api_client):
        _enable_sso()
        mock_discovery.return_value = {
            'authorization_endpoint': 'https://auth.example.com/application/o/authorize/',
            'token_endpoint': 'https://auth.example.com/application/o/token/',
        }
        mock_exchange.return_value = {'id_token': 'fake-id-token'}
        mock_decode.return_value = {
            'sub': 'auth-sub-fail-001',
            'email': 'invalid@example.com',
            'nonce': 'nonce',
        }

        response = api_client.get('/api/auth/sso/callback/', {'code': 'auth-code', 'state': 'invalid-state'})
        assert response.status_code == 401

    def test_sso_redirect_blocked_when_sso_disabled(self, api_client):
        _set_config('auth.sso_enabled', False)

        response = api_client.get('/api/auth/sso/redirect/')
        assert response.status_code == 403

    def test_identity_link_endpoint_links_and_is_idempotent(self, api_client, member_user):
        _enable_sso()
        login = api_client.post(
            '/api/auth/login/',
            {
                'username': member_user.username,
                'password': 'MemberPass123!',
            },
            format='json',
        )
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        first = api_client.post(
            '/api/auth/identity/link/',
            {
                'provider': 'authentik',
                'external_id': 'manual-link-001',
                'email': member_user.email,
            },
            format='json',
        )
        assert first.status_code == 200
        assert first.data['created'] is True

        second = api_client.post(
            '/api/auth/identity/link/',
            {
                'provider': 'authentik',
                'external_id': 'manual-link-001',
                'email': member_user.email,
            },
            format='json',
        )
        assert second.status_code == 200
        assert second.data['created'] is False

    def test_identity_link_conflict_when_external_id_belongs_to_another_user(self, api_client, member_user, editor_user):
        _enable_sso()
        UserAuthProvider.objects.create(
            user=editor_user,
            provider='authentik',
            external_id='shared-external-id',
            extra_data={'email': editor_user.email},
            is_primary=True,
            is_active=True,
        )

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
            '/api/auth/identity/link/',
            {
                'provider': 'authentik',
                'external_id': 'shared-external-id',
            },
            format='json',
        )
        assert response.status_code == 409


@pytest.mark.django_db
class TestPermissionDiscovery:
    def test_discovery_creates_lowercase_permission_names(self):
        discover_permissions()

        assert Permission.objects.filter(name='api.course.list', is_active=True).exists()
        assert Permission.objects.filter(name='api.course.tree', is_active=True).exists()
        assert Permission.objects.filter(name='api.challenge.submit_flag', is_active=True).exists()
        assert Permission.objects.filter(name='api.system_config.update', is_active=True).exists()

    def test_discovery_is_idempotent(self):
        discover_permissions()
        first_permission_count = Permission.objects.count()
        first_link_count = RolePermission.objects.count()

        discover_permissions()
        second_permission_count = Permission.objects.count()
        second_link_count = RolePermission.objects.count()

        assert first_permission_count == second_permission_count
        assert first_link_count == second_link_count

    def test_discovery_marks_stale_permissions_inactive(self):
        stale = Permission.objects.create(
            name='api.legacy.old_handler',
            description='Legacy endpoint',
            is_active=True,
        )

        discover_permissions()
        stale.refresh_from_db()

        assert stale.is_active is False

    def test_discovery_syncs_roles_and_mappings(self):
        discover_permissions()

        admin = Role.objects.get(name='Admin')
        editor = Role.objects.get(name='Editor')
        member = Role.objects.get(name='Member')

        for role in [admin, editor, member]:
            assert role.is_system is True

        # Class-level grant still applies to baseline handlers.
        list_permission = Permission.objects.get(name='api.course.list')
        assert RolePermission.objects.filter(role=member, permission=list_permission).exists()

        # Handler-level grant overrides class-level grant for custom action.
        tree_permission = Permission.objects.get(name='api.course.tree')
        assert RolePermission.objects.filter(role=admin, permission=tree_permission).exists()
        assert RolePermission.objects.filter(role=editor, permission=tree_permission).exists()
        assert not RolePermission.objects.filter(role=member, permission=tree_permission).exists()

        # Handler-level grant overrides class-level grant for default mixin action.
        create_permission = Permission.objects.get(name='api.course.create')
        assert RolePermission.objects.filter(role=admin, permission=create_permission).exists()
        assert RolePermission.objects.filter(role=editor, permission=create_permission).exists()
        assert not RolePermission.objects.filter(role=member, permission=create_permission).exists()


@pytest.mark.django_db
class TestJWTPermission:
    """Tests for HasJWTPermission class and bitmap checking"""

    def test_check_bit_in_bitmap_set_bit(self):
        """Test checking a set bit in bitmap"""
        from auth_app.permissions import check_bit_in_bitmap
        import base64
        
        # Create bitmap: bit 0 and bit 3 set
        bitmap = bytearray(32)
        bitmap[0] = 0b00001001  # bits 0 and 3 set (LSB first)
        bitmap_b64 = base64.b64encode(bytes(bitmap)).decode('utf-8')
        
        assert check_bit_in_bitmap(bitmap_b64, 0) is True
        assert check_bit_in_bitmap(bitmap_b64, 3) is True
        assert check_bit_in_bitmap(bitmap_b64, 1) is False
        assert check_bit_in_bitmap(bitmap_b64, 2) is False

    def test_check_bit_in_bitmap_empty(self):
        """Test checking bits in empty bitmap"""
        from auth_app.permissions import check_bit_in_bitmap
        import base64
        
        bitmap = bytearray(32)
        bitmap_b64 = base64.b64encode(bytes(bitmap)).decode('utf-8')
        
        assert check_bit_in_bitmap(bitmap_b64, 0) is False
        assert check_bit_in_bitmap(bitmap_b64, 255) is False

    def test_check_bit_in_bitmap_out_of_range(self):
        """Test checking bits outside valid range"""
        from auth_app.permissions import check_bit_in_bitmap
        import base64
        
        bitmap = bytearray(32)
        bitmap_b64 = base64.b64encode(bytes(bitmap)).decode('utf-8')
        
        with pytest.raises(ValueError):
            check_bit_in_bitmap(bitmap_b64, 256)
        
        with pytest.raises(ValueError):
            check_bit_in_bitmap(bitmap_b64, -1)

    def test_check_bit_in_bitmap_invalid_b64(self):
        """Test with invalid base64 input"""
        from auth_app.permissions import check_bit_in_bitmap
        
        assert check_bit_in_bitmap('invalid!!!', 0) is False
        assert check_bit_in_bitmap('', 0) is False

    def test_check_bit_in_bitmap_byte_boundary(self):
        """Test checking bits across byte boundaries"""
        from auth_app.permissions import check_bit_in_bitmap
        import base64
        
        bitmap = bytearray(32)
        bitmap[0] = 0xFF  # First byte: all bits set
        bitmap[1] = 0x00  # Second byte: no bits set
        bitmap_b64 = base64.b64encode(bytes(bitmap)).decode('utf-8')
        
        # Bits in first byte
        for i in range(8):
            assert check_bit_in_bitmap(bitmap_b64, i) is True
        
        # Bits in second byte
        for i in range(8, 16):
            assert check_bit_in_bitmap(bitmap_b64, i) is False

    def test_has_jwt_permission_allows_authenticated_with_bypass_disabled(self, api_client, member_user):
        """Test permission check bypassed when auth.authorization_enabled=false"""
        from auth_app.permissions import HasJWTPermission
        from unittest.mock import Mock
        
        # Set bypass enabled (disabled authZ)
        SystemConfig.objects.create(
            key='auth.authorization_enabled',
            value=False,
            value_type=SystemConfig.ConfigType.BOOL,
            category='auth',
            is_runtime=True,
            is_editable=True,
        )
        
        permission = HasJWTPermission('api.nonexistent.perm')
        request = Mock()
        request.user = member_user  # Real user object already has is_authenticated
        request.auth = None  # No JWT data, but should pass due to bypass
        
        assert permission.has_permission(request, Mock()) is True

    def test_has_jwt_permission_checks_bitmap_when_authz_enabled(self, api_client, member_user):
        """Test permission bitmap is checked when auth.authorization_enabled=true"""
        from auth_app.permissions import HasJWTPermission
        from unittest.mock import Mock
        import base64
        
        # Create a test permission
        test_perm = Permission.objects.create(
            name='api.test.check',
            description='Test permission',
            is_active=True,
        )
        
        # Set authZ enabled
        SystemConfig.objects.create(
            key='auth.authorization_enabled',
            value=True,
            value_type=SystemConfig.ConfigType.BOOL,
            category='auth',
            is_runtime=True,
            is_editable=True,
        )
        
        # Create bitmap with test permission bit set
        bitmap = bytearray(32)
        bitmap[test_perm.id // 8] |= (1 << (test_perm.id % 8))
        bitmap_b64 = base64.b64encode(bytes(bitmap)).decode('utf-8')
        
        permission = HasJWTPermission('api.test.check')
        request = Mock()
        request.user = member_user  # Real user object
        request.auth = {'permissions': bitmap_b64}
        
        assert permission.has_permission(request, Mock()) is True

    def test_has_jwt_permission_denies_missing_permission(self, api_client, member_user):
        """Test permission denied when bitmap doesn't have required bit"""
        from auth_app.permissions import HasJWTPermission
        from unittest.mock import Mock
        import base64
        
        # Create a test permission
        test_perm = Permission.objects.create(
            name='api.test.denied',
            description='Test permission',
            is_active=True,
        )
        
        # Set authZ enabled
        SystemConfig.objects.create(
            key='auth.authorization_enabled',
            value=True,
            value_type=SystemConfig.ConfigType.BOOL,
            category='auth',
            is_runtime=True,
            is_editable=True,
        )
        
        # Create empty bitmap (no permissions)
        bitmap = bytearray(32)
        bitmap_b64 = base64.b64encode(bytes(bitmap)).decode('utf-8')
        
        permission = HasJWTPermission('api.test.denied')
        request = Mock()
        request.user = member_user  # Real user object
        request.auth = {'permissions': bitmap_b64}
        
        assert permission.has_permission(request, Mock()) is False

    def test_has_jwt_permission_denies_unauthenticated(self, api_client):
        """Test permission denied for unauthenticated users"""
        from auth_app.permissions import HasJWTPermission
        from unittest.mock import Mock
        
        permission = HasJWTPermission('api.test.perm')
        request = Mock()
        request.user = None
        
        assert permission.has_permission(request, Mock()) is False

    def test_has_jwt_permission_allows_no_specific_permission(self, api_client, member_user):
        """Test authenticated users allowed if no specific permission required"""
        from auth_app.permissions import HasJWTPermission
        from unittest.mock import Mock
        
        permission = HasJWTPermission(None)  # No specific permission
        request = Mock()
        request.user = member_user  # Real user object
        
        assert permission.has_permission(request, Mock()) is True

    def test_has_jwt_permission_handles_nonexistent_permission(self, api_client, member_user):
        """Test permission denied when permission doesn't exist"""
        from auth_app.permissions import HasJWTPermission
        from unittest.mock import Mock
        import base64
        
        # Set authZ enabled
        SystemConfig.objects.create(
            key='auth.authorization_enabled',
            value=True,
            value_type=SystemConfig.ConfigType.BOOL,
            category='auth',
            is_runtime=True,
            is_editable=True,
        )
        
        bitmap = bytearray(32)
        bitmap_b64 = base64.b64encode(bytes(bitmap)).decode('utf-8')
        
        permission = HasJWTPermission('api.nonexistent.perm')
        request = Mock()
        request.user = member_user  # Real user object
        request.auth = {'permissions': bitmap_b64}
        
        assert permission.has_permission(request, Mock()) is False
