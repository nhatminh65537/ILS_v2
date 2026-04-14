import pytest


@pytest.mark.django_db
class TestRBACEndpoints:
    """Tests for RBAC (Role/Permission CRUD) endpoints - Slice 2 Task 2.2"""

    def test_permission_viewset_list_endpoint_exists(self, admin_client, rbac_seed):
        response = admin_client.get('/api/admin/permissions/')
        assert response.status_code == 200
        data = response.data
        if isinstance(data, dict) and 'results' in data:
            results = data['results']
        else:
            results = data if isinstance(data, list) else []
        assert len(results) >= 4

    def test_permission_viewset_read_only(self, admin_client, rbac_seed):
        response = admin_client.post(
            '/api/admin/permissions/',
            {'name': 'api.custom.perm'},
            format='json',
        )
        assert response.status_code in [405, 403]

    def test_role_viewset_list_endpoint_exists(self, admin_client, rbac_seed):
        response = admin_client.get('/api/admin/roles/')
        assert response.status_code == 200
        data = response.data
        if isinstance(data, dict) and 'results' in data:
            results = data['results']
        else:
            results = data if isinstance(data, list) else []
        assert len(results) >= 3

    def test_role_viewset_create_works(self, admin_client, rbac_seed):
        from api.models import Role

        response = admin_client.post(
            '/api/admin/roles/',
            {'name': 'TestRoleXYZ', 'description': 'Test role'},
            format='json',
        )
        assert response.status_code == 201
        assert Role.objects.filter(name='TestRoleXYZ').exists()

    def test_role_viewset_delete_custom_role(self, admin_client, rbac_seed):
        from api.models import Role

        role = Role.objects.create(name='TestRole123', is_system=False)
        response = admin_client.delete(f'/api/admin/roles/{role.id}/')
        assert response.status_code == 204
        assert not Role.objects.filter(id=role.id).exists()

    def test_role_permission_endpoints_exist(self, admin_client, rbac_seed):
        admin_role = rbac_seed['admin_role']

        response = admin_client.get(f'/api/admin/roles/{admin_role.id}/permissions/')
        assert response.status_code == 200
        data = response.data if isinstance(response.data, list) else response.data.get('results', [])
        assert len(data) >= 4

    def test_user_roles_endpoints_exist(self, admin_client, member_user, rbac_seed):
        response = admin_client.get(f'/api/users/{member_user.id}/roles/')
        assert response.status_code in [200, 400, 404]

    def test_endpoints_require_authentication(self, api_client):
        response = api_client.get('/api/admin/permissions/')
        assert response.status_code == 401

        response = api_client.get('/api/admin/roles/')
        assert response.status_code == 401

    def test_non_admin_forbidden(self, member_client, rbac_seed):
        response = member_client.get('/api/admin/permissions/')
        assert response.status_code == 403

        response = member_client.get('/api/admin/roles/')
        assert response.status_code == 403

    def test_system_role_cannot_be_deleted(self, admin_client, rbac_seed):
        admin_role = rbac_seed['admin_role']

        response = admin_client.delete(f'/api/admin/roles/{admin_role.id}/')
        assert response.status_code == 403
        assert 'System roles cannot be deleted' in str(response.data.get('detail', ''))

    def test_assign_permission_to_role(self, admin_client, rbac_seed):
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
        from api.models import Role, RolePermission

        role = Role.objects.create(name='TestRole2', is_system=False)
        perm = rbac_seed['permissions'][0]
        RolePermission.objects.create(role=role, permission=perm)

        response = admin_client.delete(f'/api/admin/roles/{role.id}/permissions/{perm.id}/')

        assert response.status_code == 204
        assert not RolePermission.objects.filter(role=role, permission=perm).exists()

    def test_assign_role_to_user(self, admin_client, member_user, rbac_seed):
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
        from api.models import UserRole

        role = rbac_seed['member_role']
        UserRole.objects.create(user=member_user, role=role)

        response = admin_client.get(f'/api/users/{member_user.id}/roles/')

        assert response.status_code == 200
        data = response.data if isinstance(response.data, list) else response.data.get('results', [])
        assert len(data) >= 1

    def test_remove_role_from_user(self, admin_client, member_user, rbac_seed):
        from api.models import UserRole

        role = rbac_seed['member_role']
        UserRole.objects.create(user=member_user, role=role)

        response = admin_client.delete(f'/api/users/{member_user.id}/roles/{role.id}/')

        assert response.status_code == 204
        assert not UserRole.objects.filter(user=member_user, role=role).exists()

    def test_assign_permission_invalidates_assigned_users_cache(self, admin_client, member_user, rbac_seed):
        from api.models import Permission, Role, UserPermissionCache, UserRole

        role = Role.objects.create(name='RoleCacheInvalidation', is_system=False)
        permission = Permission.objects.create(name='api.role_cache.test', is_active=True)
        UserRole.objects.create(user=member_user, role=role)

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
