"""
Auth permissions module
Handles RBAC decorators and DRF permission classes
"""
import base64
from rest_framework.permissions import BasePermission

ROLE_GRANTED_ATTR = '__role_granted__'


def add_role_granted(*roles: str):
    """Attach built-in role grants metadata to a class-based view."""
    normalized_roles = tuple(role for role in roles if isinstance(role, str) and role.strip())

    def decorator(view_class):
        setattr(view_class, ROLE_GRANTED_ATTR, normalized_roles)
        return view_class

    return decorator


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
        
        Bypass logic:
            1. If auth.authorization_enabled=false, allow all authenticated users
            2. Check JWT bitmap for permission bit at permission.id
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
        
        # If no specific permission required, allow authenticated users
        if not self.permission_key:
            return True
        
        # Extract permission bitmap from JWT token
        token_data = request.auth or {}
        permissions_bitmap = token_data.get('permissions', '')
        
        if not permissions_bitmap:
            return False
        
        try:
            # Get permission object to determine bit index
            from api.models import Permission
            permission = Permission.objects.get(name=self.permission_key)
            
            # Check if bit is set in bitmap
            has_perm = check_bit_in_bitmap(permissions_bitmap, permission.id)
            return has_perm
        except Permission.DoesNotExist:
            # Permission doesn't exist, deny
            return False
        except Exception:
            # Bitmap decode error, deny
            return False
            return False
