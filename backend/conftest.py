"""
Shared pytest fixtures for ILS v2 backend tests.

Usage in test files:
    def test_something(api_client, admin_user, member_user):
        ...
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient


User = get_user_model()


# ── RBAC Fixtures (built-in roles & permissions) ──────────────────────────────

@pytest.fixture
def rbac_seed(db):
	"""Seed built-in roles and sample permissions for RBAC tests."""
	from api.models import Role, Permission, RolePermission
	
	# Create built-in roles (matches Task 2.1 auto-discovery)
	admin_role = Role.objects.create(name='Admin', is_system=True)
	editor_role = Role.objects.create(name='Editor', is_system=True)
	member_role = Role.objects.create(name='Member', is_system=True)
	
	# Create sample permissions
	perms = [
		Permission.objects.create(name='api.config.read', is_active=True),
		Permission.objects.create(name='api.config.write', is_active=True),
		Permission.objects.create(name='api.user.read', is_active=True),
		Permission.objects.create(name='api.user.write', is_active=True),
	]
	
	# Assign permissions to Admin role
	for perm in perms:
		RolePermission.objects.create(role=admin_role, permission=perm)
	
	return {
		'admin_role': admin_role,
		'editor_role': editor_role,
		'member_role': member_role,
		'permissions': perms,
	}


# ── Users ─────────────────────────────────────────────────────────────────────

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


# ── Authenticated clients ──────────────────────────────────────────────────────

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


# ── JWT tokens (for when auth endpoints are implemented) ─────────────────────

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
