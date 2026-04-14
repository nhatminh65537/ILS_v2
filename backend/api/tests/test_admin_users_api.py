from datetime import timedelta

import pytest
from django.utils import timezone

from api.models import Role, User, UserProfile, UserRole, UserSession
from auth_app.services.session_service import SessionService


def _extract_results(payload):
    if isinstance(payload, dict) and 'results' in payload:
        return payload['results']
    if isinstance(payload, list):
        return payload
    return []


@pytest.fixture
def admin_user_seed(db, rbac_seed):
    admin_user = User.objects.create_superuser(
        username='task8_admin',
        password='AdminPass123!',
        email='task8_admin@example.com',
    )
    UserProfile.objects.create(user=admin_user, display_name='Task8 Admin')
    return admin_user


@pytest.mark.django_db
class TestAdminUserManagementAPI:
    def test_admin_list_filters_by_active_and_date_joined(self, admin_client, rbac_seed):
        old_user = User.objects.create_user(
            username='task8_old',
            password='OldPass123!',
            email='old@example.com',
            is_active=True,
        )
        recent_user = User.objects.create_user(
            username='task8_recent',
            password='RecentPass123!',
            email='recent@example.com',
            is_active=True,
        )
        inactive_user = User.objects.create_user(
            username='task8_inactive',
            password='InactivePass123!',
            email='inactive@example.com',
            is_active=False,
        )
        UserProfile.objects.create(user=old_user, display_name='Old User')
        UserProfile.objects.create(user=recent_user, display_name='Recent User')
        UserProfile.objects.create(user=inactive_user, display_name='Inactive User')

        User.objects.filter(pk=old_user.pk).update(date_joined=timezone.now() - timedelta(days=10))
        User.objects.filter(pk=recent_user.pk).update(date_joined=timezone.now() - timedelta(days=1))
        User.objects.filter(pk=inactive_user.pk).update(date_joined=timezone.now() - timedelta(days=1))

        response = admin_client.get(
            '/api/admin/users/',
            {
                'is_active': 'true',
                'date_joined_from': (timezone.now() - timedelta(days=2)).date().isoformat(),
                'date_joined_to': timezone.now().date().isoformat(),
            },
        )

        assert response.status_code == 200
        results = _extract_results(response.data)
        usernames = {item['username'] for item in results}
        assert usernames == {'task8_recent'}

    def test_admin_list_requires_admin(self, api_client, member_client, rbac_seed):
        response = api_client.get('/api/admin/users/')
        assert response.status_code in [401, 403]

        response = member_client.get('/api/admin/users/')
        assert response.status_code == 403

    def test_admin_create_user_allows_optional_password_and_defaults_member_role(self, admin_client, rbac_seed):
        response = admin_client.post(
            '/api/admin/users/',
            {
                'username': 'task8_created',
                'email': 'created@example.com',
                'first_name': 'Created',
                'last_name': 'User',
            },
            format='json',
        )

        assert response.status_code == 201
        assert response.data['username'] == 'task8_created'
        assert response.data['profile'] is not None
        assert any(role['name'] == 'Member' for role in response.data['roles'])

        user = User.objects.get(username='task8_created')
        assert user.has_usable_password() is False
        assert UserProfile.objects.filter(user=user).exists()
        assert UserRole.objects.filter(user=user, role__name='Member').exists()

    def test_admin_update_user_replaces_roles_and_revokes_sessions(self, admin_client, rbac_seed):
        member_role = rbac_seed['member_role']
        editor_role = rbac_seed['editor_role']

        user = User.objects.create_user(
            username='task8_update',
            password='UpdatePass123!',
            email='update@example.com',
            is_active=True,
        )
        UserProfile.objects.create(user=user, display_name='Update User')
        UserRole.objects.create(user=user, role=member_role)

        SessionService().create_session(user, 'refresh-token-task8', 'browser')
        before_version = user.permission_version

        response = admin_client.patch(
            f'/api/admin/users/{user.id}/',
            {
                'is_active': False,
                'role_ids': [editor_role.id],
            },
            format='json',
        )

        assert response.status_code == 200
        assert response.data['is_active'] is False
        assert response.data['profile'] is not None
        assert [role['name'] for role in response.data['roles']] == ['Editor']

        user.refresh_from_db()
        assert user.permission_version > before_version
        assert UserRole.objects.filter(user=user, role=editor_role).exists()
        assert not UserRole.objects.filter(user=user, role=member_role).exists()
        assert UserSession.objects.filter(user=user, revoked_at__isnull=True).count() == 0

    def test_public_profile_routes_still_work(self, api_client):
        user = User.objects.create_user(
            username='task8_public',
            password='PublicPass123!',
            email='public@example.com',
        )
        UserProfile.objects.create(user=user, display_name='Public User')

        response = api_client.get(f'/api/users/{user.username}/profile/')
        assert response.status_code == 200
        assert response.data['username'] == user.username
