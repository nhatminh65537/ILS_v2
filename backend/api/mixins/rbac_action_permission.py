from rest_framework import permissions
from rest_framework.permissions import IsAuthenticated

from auth_app.permissions import HasJWTPermission


class RBACActionPermissionMixin:
    action_permission_map: dict[str, str] = {}
    base_permission_classes = (IsAuthenticated, permissions.IsAdminUser)

    def get_permissions(self):
        permission_classes = getattr(self, 'base_permission_classes', None) or getattr(self, 'permission_classes', ())
        base_permissions = [permission() if isinstance(permission, type) else permission for permission in permission_classes]

        permission_key = self.action_permission_map.get(getattr(self, 'action', None))
        if permission_key and getattr(self.request, 'auth', None) is not None:
            base_permissions.append(HasJWTPermission(permission_key))

        return base_permissions
