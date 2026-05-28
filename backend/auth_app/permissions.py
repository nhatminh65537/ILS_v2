"""
Auth permissions module
Handles RBAC decorators and DRF permission classes
"""
import base64
import re
from rest_framework.permissions import BasePermission

from auth_app.constants import BUILTIN_ROLE_MEMBER

ROLE_GRANTED_ATTR = '__role_granted__'


def add_role_granted(*roles: str):
    """Attach built-in role grants metadata to a class or handler method."""
    normalized_roles = tuple(
        role.strip() for role in roles if isinstance(role, str) and role.strip()
    )

    def decorator(target):
        setattr(target, ROLE_GRANTED_ATTR, normalized_roles)
        return target

    return decorator


def get_role_granted(target) -> tuple[str, ...]:
    """Read role grants metadata from a class or handler method."""
    grants = getattr(target, ROLE_GRANTED_ATTR, ())
    if not grants:
        return ()
    return tuple(role for role in grants if isinstance(role, str) and role.strip())


def _normalize_resource_name(class_name: str) -> str:
    """Convert ViewSet class name to snake_case resource name."""
    base = class_name or 'endpoint'
    for suffix in ('GenericViewSet', 'APIView', 'ViewSet', 'View'):
        if base.endswith(suffix):
            base = base[: -len(suffix)]
            break
    if not base:
        base = class_name or 'endpoint'
    snake = re.sub(r'(.)([A-Z][a-z]+)', r'\1_\2', base)
    snake = re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', snake)
    return snake.strip('_').lower() or 'endpoint'


def derive_permission_key(view_class, action: str) -> str:
    """
    Derive permission key from view class and action name.

    Uses the same logic as the endpoint scanner so that runtime checks
    always match the names stored in the database by discover_permissions().

    Example: RoleViewSet + 'list' → 'api.role.list'
    """
    module = getattr(view_class, '__module__', '')
    app_label = (module.split('.', 1)[0] or 'api').lower()
    resource = _normalize_resource_name(view_class.__name__)
    return f'{app_label}.{resource}.{action}'.lower()


def check_bit_in_bitmap(bitmap_b64: str, bit_index: int) -> bool:
    """
    Check if a specific bit is set in base64-encoded bitmap.
    
    Args:
        bitmap_b64: Base64-encoded binary bitmap
        bit_index: Bit position to check (0-255)
    
    Returns:
        True if bit is set, False otherwise
    
    Raises:
        ValueError: If bitmap is invalid or bit_index out of range
    """
    if not bitmap_b64:
        return False
    
    if bit_index < 0 or bit_index >= 256:
        raise ValueError(f"Bit index must be 0-255, got {bit_index}")
    
    try:
        bitmap_bytes = base64.b64decode(bitmap_b64)
    except Exception:
        return False
    
    byte_index = bit_index // 8
    bit_offset = bit_index % 8
    
    if byte_index >= len(bitmap_bytes):
        return False
    
    # Check if bit is set (bit order: LSB first in each byte)
    byte_val = bitmap_bytes[byte_index]
    return bool((byte_val >> bit_offset) & 1)


class HasJWTPermission(BasePermission):
    """
    DRF permission class that checks JWT claims for permission bitmap.
    
    - Extracts permission bitmap from JWT token
    - Checks if user has specific permission by testing bit at permission ID
    - Supports development bypass via auth.authorization_enabled config
    
    Usage:
        @action(detail=False, permission_classes=[IsAuthenticated, HasJWTPermission('api.role.list')])
        def my_view(self, request):
            ...
    """
    
    def __init__(self, permission_key: str = None):
        super().__init__()
        self.permission_key = permission_key
    
    def has_permission(self, request, view):
        """
        Check if user has permission in JWT claims.

        Permission check order:
            1. auth.authorization_enabled=false → allow all authenticated users (dev bypass)
            2. JWT bitmap present → bitmap check (production path)
            3. No JWT bitmap (force_authenticate in tests) → role-grant fallback:
               - superuser → allow
               - 'Member' in effective_roles → allow (any authenticated user)
               - otherwise → check DB UserRole entries

        Permission key resolution (when not explicit):
            1. Auto-derived from view class + action: RoleViewSet + 'list' → 'api.role.list'
            2. No string action (non-viewset or Mock view) → no restriction
        """
        # Import here to avoid circular imports and ensure Django setup
        from api.utils import get_config

        # Development bypass: if authZ disabled, allow access
        try:
            if not get_config('auth.authorization_enabled', True):
                return request.user and request.user.is_authenticated
        except Exception:
            # If config lookup fails, continue with normal check
            pass

        # User must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        user = request.user

        # Resolve action name (must be a string — guard against Mock in tests)
        action = getattr(view, 'action', None)
        if not isinstance(action, str):
            action = None

        # Resolve permission key
        key = self.permission_key
        if not key:
            if not action:
                # Non-viewset view or unknown action — no restriction
                return True
            key = derive_permission_key(view.__class__, action)

        # ── Fast path: JWT bitmap ────────────────────────────────────────────
        token_data = request.auth if isinstance(request.auth, dict) else {}
        permissions_bitmap = token_data.get('permissions', '')

        if permissions_bitmap:
            try:
                from api.models import Permission
                permission = Permission.objects.get(name=key)
                return check_bit_in_bitmap(permissions_bitmap, permission.id)
            except Permission.DoesNotExist:
                # Permission not in DB — deny (scanner must have run first)
                return False
            except Exception:
                return False

        # ── Fallback: no JWT bitmap (e.g. force_authenticate in tests) ───────
        # Resolve effective roles from @add_role_granted metadata
        if user.is_superuser:
            return True

        handler = getattr(view.__class__, action, None) if action else None
        handler_roles = get_role_granted(handler) if handler else ()
        class_roles = get_role_granted(view.__class__)
        effective_roles = handler_roles if handler_roles else class_roles

        if not effective_roles:
            # Endpoint has no role restriction → allow authenticated users
            return True

        if BUILTIN_ROLE_MEMBER in effective_roles:
            # Any authenticated user qualifies for Member-grade endpoints
            return True

        # Elevated roles (Admin, Editor) → check DB
        return user.user_roles.filter(role__name__in=effective_roles).exists()
