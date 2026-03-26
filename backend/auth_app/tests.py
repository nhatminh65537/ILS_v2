import hashlib

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache

from api.models import Role, SystemConfig, UserProfile, UserRole, UserSession


User = get_user_model()


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
