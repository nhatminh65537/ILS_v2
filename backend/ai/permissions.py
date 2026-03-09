from rest_framework.permissions import BasePermission


class HasAIPermission(BasePermission):
    """
    Check JWT permission claims (NOT Django's built-in permission system).
    Usage: permission_classes = [HasAIPermission('ai.learn_assistant')]
    See ARCHITECTURE.md §7: never use request.user.has_perm() — use JWT claims.
    """
    def __init__(self, permission_key: str):
        self.permission_key = permission_key

    def has_permission(self, request, view):
        if not request.auth:
            return False
        token_permissions = request.auth.get('permissions', [])
        return self.permission_key in token_permissions
