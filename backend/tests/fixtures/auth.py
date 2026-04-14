import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient


User = get_user_model()


@pytest.fixture
def api_client():
    """Unauthenticated DRF test client."""
    return APIClient()


@pytest.fixture
def admin_user(db):
    """Admin user (is_staff=True, is_superuser=True)."""
    return User.objects.create_superuser(
        username='admin_test',
        password='AdminPass123!',
        email='admin@test.com',
    )


@pytest.fixture
def editor_user(db):
    """Editor user (is_staff=True)."""
    return User.objects.create_user(
        username='editor_test',
        password='EditorPass123!',
        email='editor@test.com',
        is_staff=True,
    )


@pytest.fixture
def member_user(db):
    """Regular member user."""
    return User.objects.create_user(
        username='member_test',
        password='MemberPass123!',
        email='member@test.com',
    )


@pytest.fixture
def admin_client(api_client, admin_user):
    """API client authenticated as admin."""
    api_client.force_authenticate(user=admin_user)
    return api_client


@pytest.fixture
def editor_client(api_client, editor_user):
    """API client authenticated as editor."""
    api_client.force_authenticate(user=editor_user)
    return api_client


@pytest.fixture
def member_client(api_client, member_user):
    """API client authenticated as member."""
    api_client.force_authenticate(user=member_user)
    return api_client


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
