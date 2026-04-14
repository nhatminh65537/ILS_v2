from api.models import Permission, RolePermission
from api.services.permission_service import PermissionService


class RoleService:
    """Domain operations for role-permission management."""

    @staticmethod
    def invalidate_role_users_cache(role):
        for user_role in role.users.select_related('user').all():
            PermissionService.invalidate_cache(user_role.user)

    @classmethod
    def assign_permission(cls, role, permission_id):
        permission = Permission.objects.get(id=permission_id)
        _, created = RolePermission.objects.get_or_create(role=role, permission=permission)
        if created:
            cls.invalidate_role_users_cache(role)
        return created

    @classmethod
    def revoke_permission(cls, role, permission_id):
        role_perm = RolePermission.objects.get(role=role, permission_id=permission_id)
        role_perm.delete()
        cls.invalidate_role_users_cache(role)
