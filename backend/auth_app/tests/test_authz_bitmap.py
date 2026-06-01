"""Authorization regression tests exercising the real JWT bitmap path.

These tests guard the bug found during Integration Test Pass 1: the production
authorization path (encoded permission bitmap in the access token) was being
bypassed entirely, and authorization silently fell back to a role-name check.
Because every other test authenticates with ``force_authenticate`` (which leaves
``request.auth`` as ``None``), the bitmap path was never covered.

Every test here authenticates with a *real* JWT so that ``HasJWTPermission``
reads the encoded bitmap — the same code path that runs in production.
"""

import pytest
from django.contrib.auth import get_user_model

from api.models import Permission, Role, RolePermission, SystemConfig, UserRole
from auth_app.services.token_service import TokenService


User = get_user_model()

ADMIN_USERS_PERMISSION = 'api.admin_user.list'
PROTECTED_ENDPOINT = '/api/admin/users/'


def _jwt_client(user):
    from rest_framework.test import APIClient

    tokens = TokenService().issue_tokens_for_new_session(user, device_info='pytest')
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    return client


@pytest.fixture
def _enforce_authz(db):
    """Force authorization ON regardless of seeded config defaults."""
    SystemConfig.objects.update_or_create(
        key='auth.authorization_enabled',
        defaults={
            'value': 'true',
            'value_type': SystemConfig.ConfigType.BOOL,
            'category': 'auth',
        },
    )


@pytest.mark.django_db
class TestBitmapAuthorization:
    def test_custom_role_with_permission_grants_access(self, _enforce_authz):
        """A non-built-in role carrying the endpoint's permission must pass.

        This is the exact [B-03] scenario: the user has NO Admin/Editor/Member
        role, only a custom role linked to ``api.admin_user.list``. The old
        role-name fallback would deny this; the bitmap path must allow it.
        """
        user = User.objects.create_user(
            username='custom_mgr', password='Pass123!', email='custom_mgr@test.com'
        )
        manager = Role.objects.create(name='CustomManager', is_system=False)
        perm = Permission.objects.get(name=ADMIN_USERS_PERMISSION)
        RolePermission.objects.create(role=manager, permission=perm)
        UserRole.objects.create(user=user, role=manager)

        response = _jwt_client(user).get(PROTECTED_ENDPOINT)

        assert response.status_code == 200

    def test_user_without_permission_is_denied(self, _enforce_authz):
        """A user whose roles do not include the permission must get 403."""
        user = User.objects.create_user(
            username='plain_member', password='Pass123!', email='plain_member@test.com'
        )
        member = Role.objects.get_or_create(name='Member', defaults={'is_system': True})[0]
        UserRole.objects.create(user=user, role=member)

        response = _jwt_client(user).get(PROTECTED_ENDPOINT)

        assert response.status_code == 403

    def test_superuser_without_role_is_denied(self, _enforce_authz):
        """``is_superuser`` no longer bypasses authorization.

        A superuser with no Role assignment holds no permissions and must be
        denied — authorization is purely permission-driven.
        """
        superuser = User.objects.create_superuser(
            username='lonely_root', password='Pass123!', email='root@test.com'
        )
        # Intentionally NO role assigned.

        response = _jwt_client(superuser).get(PROTECTED_ENDPOINT)

        assert response.status_code == 403

    def test_admin_role_grants_access(self, _enforce_authz):
        """Sanity: the built-in Admin role (linked via discovery) still passes."""
        user = User.objects.create_user(
            username='real_admin', password='Pass123!', email='real_admin@test.com'
        )
        admin_role = Role.objects.get_or_create(name='Admin', defaults={'is_system': True})[0]
        UserRole.objects.create(user=user, role=admin_role)

        response = _jwt_client(user).get(PROTECTED_ENDPOINT)

        assert response.status_code == 200

    def test_unauthenticated_request_is_rejected(self, _enforce_authz):
        from rest_framework.test import APIClient

        response = APIClient().get(PROTECTED_ENDPOINT)

        assert response.status_code in (401, 403)
