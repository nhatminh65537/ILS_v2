from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache

from api.models import SystemConfig, UserAuthProvider, UserProfile, UserSession


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


@pytest.mark.django_db
class TestAuthSSOFlow:
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
