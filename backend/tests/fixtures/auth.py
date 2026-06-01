import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient


User = get_user_model()


def _assign_role(user, role_name):
    """Attach a built-in Role to a user (idempotent).

    The autouse ``_seed_authz_discovery`` fixture guarantees the built-in Role
    rows and their RolePermission links already exist, so we only need the
    UserRole join here. Permission caches are version-keyed, so no manual
    invalidation is required before issuing a fresh token.
    """
    from api.models import Role, UserRole

    role, _ = Role.objects.get_or_create(name=role_name, defaults={'is_system': True})
    UserRole.objects.get_or_create(user=user, role=role)
    return role


def _authenticated_client(user):
    """Return an APIClient carrying a real JWT for ``user``.

    Authorization is driven solely by the encoded permission bitmap in the
    access token (see ``HasJWTPermission``), so tests must exercise the real
    token path rather than ``force_authenticate`` — otherwise the production
    authorization code is never covered.
    """
    from auth_app.services.token_service import TokenService

    tokens = TokenService().issue_tokens_for_new_session(user, device_info='pytest')
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    return client


@pytest.fixture
def api_client():
    """Unauthenticated DRF test client."""
    return APIClient()


@pytest.fixture
def admin_user(db):
    """Admin user (superuser) with the built-in ``Admin`` role assigned.

    The role assignment is what grants permissions — ``is_superuser`` alone no
    longer bypasses authorization.
    """
    user = User.objects.create_superuser(
        username='admin_test',
        password='AdminPass123!',
        email='admin@test.com',
    )
    _assign_role(user, 'Admin')
    return user


@pytest.fixture
def editor_user(db):
    """Editor user with the built-in ``Editor`` role assigned."""
    user = User.objects.create_user(
        username='editor_test',
        password='EditorPass123!',
        email='editor@test.com',
        is_staff=True,
    )
    _assign_role(user, 'Editor')
    return user


@pytest.fixture
def member_user(db):
    """Regular member user with the built-in ``Member`` role assigned."""
    user = User.objects.create_user(
        username='member_test',
        password='MemberPass123!',
        email='member@test.com',
    )
    _assign_role(user, 'Member')
    return user


@pytest.fixture
def admin_client(admin_user):
    """API client authenticated as admin via a real JWT."""
    return _authenticated_client(admin_user)


@pytest.fixture
def editor_client(editor_user):
    """API client authenticated as editor via a real JWT."""
    return _authenticated_client(editor_user)


@pytest.fixture
def member_client(member_user):
    """API client authenticated as member via a real JWT."""
    return _authenticated_client(member_user)


@pytest.fixture
def jwt_tokens(member_user, api_client):
    """
    Get JWT access + refresh tokens for member_user via login endpoint.
    Only works after Slice 1 (auth) is implemented.
    """
    response = api_client.post('/api/auth/login/', {
        'username': member_user.username,
        'password': 'MemberPass123!',
    })
    assert response.status_code == 200, f"Login failed: {response.data}"
    return response.data
