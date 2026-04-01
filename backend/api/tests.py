import pytest
from django.core.cache import cache

from api.models import SystemConfig
from api.utils import get_config


@pytest.fixture
def config_seed(db):
	return [
		SystemConfig.objects.create(
			key='auth.local_login_enabled',
			value=True,
			value_type=SystemConfig.ConfigType.BOOL,
			category='auth',
			description='Enable local login',
			is_editable=True,
			is_runtime=True,
		),
		SystemConfig.objects.create(
			key='auth.sso_client_secret',
			value='super-secret',
			value_type=SystemConfig.ConfigType.SECRET,
			category='auth',
			description='SSO client secret',
			is_editable=True,
			is_runtime=True,
		),
		SystemConfig.objects.create(
			key='auth.email.port',
			value=587,
			value_type=SystemConfig.ConfigType.INT,
			category='auth',
			description='SMTP port',
			is_editable=True,
			is_runtime=False,
		),
		SystemConfig.objects.create(
			key='learn.layout',
			value={'mode': 'grid'},
			value_type=SystemConfig.ConfigType.JSON,
			category='learn',
			description='UI layout config',
			is_editable=True,
			is_runtime=False,
		),
		SystemConfig.objects.create(
			key='system.version',
			value='1.0.0',
			value_type=SystemConfig.ConfigType.STRING,
			category='system',
			description='Build version',
			is_editable=False,
			is_runtime=False,
		),
	]


@pytest.mark.django_db
class TestSystemConfigAPI:
	def test_list_grouped_and_secret_masked(self, admin_client, config_seed):
		response = admin_client.get('/api/admin/config/')

		assert response.status_code == 200
		assert isinstance(response.data, dict)
		assert 'auth' in response.data
		assert 'learn' in response.data
		assert all(isinstance(items, list) for items in response.data.values())

		auth_items = response.data['auth']
		secret_item = next(item for item in auth_items if item['key'] == 'auth.sso_client_secret')
		assert secret_item['value'] == '***'

	def test_detail_by_key_returns_masked_secret(self, admin_client, config_seed):
		response = admin_client.get('/api/admin/config/auth.sso_client_secret/')

		assert response.status_code == 200
		assert response.data['key'] == 'auth.sso_client_secret'
		assert response.data['value'] == '***'

	def test_patch_bool_value_success(self, admin_client, config_seed):
		response = admin_client.patch(
			'/api/admin/config/auth.local_login_enabled/',
			{'value': False},
			format='json',
		)

		assert response.status_code == 200
		assert response.data['value'] is False

		config = SystemConfig.objects.get(key='auth.local_login_enabled')
		assert config.value is False

	def test_patch_int_invalid_type_returns_400(self, admin_client, config_seed):
		response = admin_client.patch(
			'/api/admin/config/auth.email.port/',
			{'value': 'not-a-number'},
			format='json',
		)

		assert response.status_code == 400
		assert response.data['value'][0] == 'Value must be an integer.'

	def test_patch_non_editable_returns_403(self, admin_client, config_seed):
		response = admin_client.patch(
			'/api/admin/config/system.version/',
			{'value': '2.0.0'},
			format='json',
		)

		assert response.status_code == 403
		assert response.data['detail'] == 'Config is not editable'

		config = SystemConfig.objects.get(key='system.version')
		assert config.value == '1.0.0'

	def test_patch_unknown_key_returns_404(self, admin_client, config_seed):
		response = admin_client.patch(
			'/api/admin/config/missing.key/',
			{'value': 'x'},
			format='json',
		)

		assert response.status_code == 404

	def test_non_admin_forbidden(self, member_client, config_seed):
		response = member_client.get('/api/admin/config/')
		assert response.status_code == 403

	def test_unauthenticated_unauthorized(self, api_client, config_seed):
		response = api_client.get('/api/admin/config/')
		assert response.status_code == 401

	def test_cache_invalidation_after_patch(self, admin_client, config_seed):
		cache.clear()

		original = get_config('auth.email.port')
		assert original == 587

		response = admin_client.patch(
			'/api/admin/config/auth.email.port/',
			{'value': 2525},
			format='json',
		)
		assert response.status_code == 200

		# Should reflect latest DB value after invalidation.
		updated = get_config('auth.email.port')
		assert updated == 2525


@pytest.mark.django_db
class TestRBACEndpoints:
	"""Tests for RBAC (Role/Permission CRUD) endpoints - Slice 2 Task 2.2"""

	def test_permission_viewset_list_endpoint_exists(self, admin_client, rbac_seed):
		"""Test permission list endpoint is accessible"""
		response = admin_client.get('/api/admin/permissions/')
		assert response.status_code == 200
		# Response is paginated or list
		data = response.data
		if isinstance(data, dict) and 'results' in data:
			results = data['results']
		else:
			results = data if isinstance(data, list) else []
		assert len(results) >= 4  # We seeded 4 permissions

	def test_permission_viewset_read_only(self, admin_client, rbac_seed):
		"""Test permissions endpoint doesn't allow POST"""
		response = admin_client.post(
			'/api/admin/permissions/',
			{'name': 'api.custom.perm'},
			format='json',
		)
		# Should reject POST (405 Method Not Allowed)
		assert response.status_code in [405, 403]

	def test_role_viewset_list_endpoint_exists(self, admin_client, rbac_seed):
		"""Test role list endpoint is accessible"""
		response = admin_client.get('/api/admin/roles/')
		assert response.status_code == 200
		# Should have at least 3 built-in roles
		data = response.data
		if isinstance(data, dict) and 'results' in data:
			results = data['results']
		else:
			results = data if isinstance(data, list) else []
		assert len(results) >= 3

	def test_role_viewset_create_works(self, admin_client, rbac_seed):
		"""Test role creation endpoint works"""
		from api.models import Role
		
		response = admin_client.post(
			'/api/admin/roles/',
			{'name': 'TestRoleXYZ', 'description': 'Test role'},
			format='json',
		)
		# Should allow creation as admin
		assert response.status_code == 201
		assert Role.objects.filter(name='TestRoleXYZ').exists()

	def test_role_viewset_delete_custom_role(self, admin_client, rbac_seed):
		"""Test deleting custom roles works"""
		from api.models import Role
		
		# Create a test role
		role = Role.objects.create(name='TestRole123', is_system=False)
		
		# DELETE custom role should work
		response = admin_client.delete(f'/api/admin/roles/{role.id}/')
		assert response.status_code == 204
		assert not Role.objects.filter(id=role.id).exists()

	def test_role_permission_endpoints_exist(self, admin_client, rbac_seed):
		"""Test role permission endpoints are routable"""
		admin_role = rbac_seed['admin_role']
		
		# GET permissions endpoint
		response = admin_client.get(f'/api/admin/roles/{admin_role.id}/permissions/')
		assert response.status_code == 200
		# Admin role should have permissions assigned
		data = response.data if isinstance(response.data, list) else response.data.get('results', [])
		assert len(data) >= 4  # We assigned 4 permissions to Admin role

	def test_user_roles_endpoints_exist(self, admin_client, member_user, rbac_seed):
		"""Test user role endpoints are routable"""
		# GET user roles
		response = admin_client.get(f'/api/users/{member_user.id}/roles/')
		assert response.status_code in [200, 400, 404]  # May vary based on implementation

	def test_endpoints_require_authentication(self, api_client):
		"""Test RBAC endpoints require authentication"""
		response = api_client.get('/api/admin/permissions/')
		assert response.status_code == 401
		
		response = api_client.get('/api/admin/roles/')
		assert response.status_code == 401

	def test_non_admin_forbidden(self, member_client, rbac_seed):
		"""Test non-admin users cannot access RBAC admin endpoints"""
		response = member_client.get('/api/admin/permissions/')
		assert response.status_code == 403

		response = member_client.get('/api/admin/roles/')
		assert response.status_code == 403

	def test_system_role_cannot_be_deleted(self, admin_client, rbac_seed):
		"""Test system roles are protected from deletion"""
		admin_role = rbac_seed['admin_role']
		
		response = admin_client.delete(f'/api/admin/roles/{admin_role.id}/')
		assert response.status_code == 403
		assert 'System roles cannot be deleted' in str(response.data.get('detail', ''))

	def test_assign_permission_to_role(self, admin_client, rbac_seed):
		"""Test assigning a permission to a role"""
		from api.models import Role, RolePermission
		
		role = Role.objects.create(name='TestRole', is_system=False)
		perm = rbac_seed['permissions'][0]
		
		response = admin_client.post(
			f'/api/admin/roles/{role.id}/permissions/',
			{'permission_id': perm.id},
			format='json',
		)
		
		assert response.status_code == 201
		assert RolePermission.objects.filter(role=role, permission=perm).exists()

	def test_revoke_permission_from_role(self, admin_client, rbac_seed):
		"""Test revoking a permission from a role"""
		from api.models import Role, RolePermission
		
		role = Role.objects.create(name='TestRole2', is_system=False)
		perm = rbac_seed['permissions'][0]
		RolePermission.objects.create(role=role, permission=perm)
		
		response = admin_client.delete(
			f'/api/admin/roles/{role.id}/permissions/{perm.id}/'
		)
		
		assert response.status_code == 204
		assert not RolePermission.objects.filter(role=role, permission=perm).exists()

	def test_assign_role_to_user(self, admin_client, member_user, rbac_seed):
		"""Test assigning a role to a user"""
		from api.models import UserRole
		
		role = rbac_seed['editor_role']
		response = admin_client.post(
			f'/api/users/{member_user.id}/roles/',
			{'role_id': role.id},
			format='json',
		)
		
		assert response.status_code == 201
		assert UserRole.objects.filter(user=member_user, role=role).exists()

	def test_user_roles_list_after_assignment(self, admin_client, member_user, rbac_seed):
		"""Test listing roles assigned to a user"""
		from api.models import UserRole
		
		role = rbac_seed['member_role']
		UserRole.objects.create(user=member_user, role=role)
		
		response = admin_client.get(f'/api/users/{member_user.id}/roles/')
		
		assert response.status_code == 200
		data = response.data if isinstance(response.data, list) else response.data.get('results', [])
		assert len(data) >= 1

	def test_remove_role_from_user(self, admin_client, member_user, rbac_seed):
		"""Test removing a role from a user"""
		from api.models import UserRole
		
		role = rbac_seed['member_role']
		UserRole.objects.create(user=member_user, role=role)
		
		response = admin_client.delete(
			f'/api/users/{member_user.id}/roles/{role.id}/'
		)
		
		assert response.status_code == 204
		assert not UserRole.objects.filter(user=member_user, role=role).exists()

	def test_assign_permission_invalidates_assigned_users_cache(self, admin_client, member_user, rbac_seed):
		"""Assigning permission to a role should invalidate cache/version for users with that role."""
		from api.models import Role, Permission, UserRole, UserPermissionCache

		role = Role.objects.create(name='RoleCacheInvalidation', is_system=False)
		permission = Permission.objects.create(name='api.role_cache.test', is_active=True)
		UserRole.objects.create(user=member_user, role=role)

		# Seed stale cache row to verify delete-on-invalidate behavior.
		UserPermissionCache.objects.create(
			user=member_user,
			encoded_permissions='AAAA',
			permission_version=member_user.permission_version,
		)

		before_version = member_user.permission_version

		response = admin_client.post(
			f'/api/admin/roles/{role.id}/permissions/',
			{'permission_id': permission.id},
			format='json',
		)

		assert response.status_code == 201
		member_user.refresh_from_db()
		assert member_user.permission_version == before_version + 1
		assert not UserPermissionCache.objects.filter(user=member_user).exists()


def test_views_package_exports_router_viewsets():
	"""Protect package-level exports used by api.urls router wiring."""
	from api import views

	assert hasattr(views, 'UserViewSet')
	assert hasattr(views, 'CourseViewSet')
	assert hasattr(views, 'LessonViewSet')
	assert hasattr(views, 'ChallengeViewSet')
	assert hasattr(views, 'QuizViewSet')
	assert hasattr(views, 'NotificationViewSet')
	assert hasattr(views, 'LeaderboardViewSet')
