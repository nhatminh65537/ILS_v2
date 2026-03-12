"""
Permission Service
Per OOP feedback: Domain service for permission computation and checking
Abstraction layer between domain and infrastructure
"""
from django.db.models import Q
from typing import Set, Dict
import json


class PermissionPolicy:
    """
    Abstract permission policy
    Per OOP feedback: Define abstraction for permission precedence
    """
    
    def merge(self, role_codes: Set[str], direct_codes: Dict[str, bool]) -> Set[str]:
        """
        Merge role permissions with direct permissions
        Args:
            role_codes: Set of permission codes from roles
            direct_codes: Dict of {code: is_allowed} from direct assignments
        Returns:
            Set of allowed permission codes
        """
        raise NotImplementedError


class DefaultPermissionPolicy(PermissionPolicy):
    """
    Default permission policy
    Rules:
    1. Role permissions are unioned
    2. Direct deny overrides role grants
    """
    
    def merge(self, role_codes: Set[str], direct_codes: Dict[str, bool]) -> Set[str]:
        denied_codes = {code for code, _ in direct_codes.items()}
        return role_codes - denied_codes


class PermissionService:
    """
    Service for permission computation and checking
    Per OOP feedback: Separate domain logic from infrastructure
    """
    
    policy = DefaultPermissionPolicy()
    
    @classmethod
    def compute_user_permissions(cls, user) -> Set[str]:
        """
        Compute all effective permissions for a user
        Considers role-based and direct permissions with proper precedence
        """
        from api.models import Permission, UserPermission, UserRole, RolePermission
        
        # Get permissions from roles
        role_perms = Permission.objects.filter(
            role_permissions__role__in=user.user_roles.values('role')
        ).values_list('name', flat=True)
        
        role_codes = set(role_perms)
        
        # Get direct deny permissions (deny-only model)
        direct_perms = UserPermission.objects.filter(user=user).select_related('permission')
        direct_codes = {
            up.permission.name: False
            for up in direct_perms
        }
        
        # Merge using policy
        allowed_codes = cls.policy.merge(role_codes, direct_codes)
        
        # Filter by active permissions only
        final_codes = set()
        
        for code in allowed_codes:
            try:
                perm = Permission.objects.get(name=code)
                if perm.is_active:
                    final_codes.add(code)
            except Permission.DoesNotExist:
                pass
        
        return final_codes
    
    @classmethod
    def check_permission(cls, user, permission_code: str) -> bool:
        """
        Check if user has a specific permission
        Uses cached permissions if available
        """
        from api.models import UserPermissionCache
        
        # Try to use cache first
        try:
            cache = user.permission_cache
            if cache.permission_version == user.permission_version:
                cached_codes = set(json.loads(cache.encoded_permissions))
                return permission_code in cached_codes
        except UserPermissionCache.DoesNotExist:
            pass
        
        # Compute fresh
        perms = cls.compute_user_permissions(user)
        
        # Update cache
        cls.update_cache(user, perms)
        
        return permission_code in perms
    
    @classmethod
    def update_cache(cls, user, permissions: Set[str]):
        """
        Update permission cache for user
        Per requirements: Cache encoded permissions for faster JWT generation
        """
        from api.models import UserPermissionCache
        encoded = json.dumps(sorted(list(permissions)))
        
        UserPermissionCache.objects.update_or_create(
            user=user,
            defaults={
                'encoded_permissions': encoded,
                'permission_version': user.permission_version
            }
        )
    
    @classmethod
    def get_cached_permissions(cls, user):
        """Get cached permissions for JWT encoding"""
        from api.models import UserPermissionCache
        
        try:
            cache = user.permission_cache
            if cache.permission_version != user.permission_version:
                # Recompute
                perms = cls.compute_user_permissions(user)
                cls.update_cache(user, perms)
                cache.refresh_from_db()
            
            return json.loads(cache.encoded_permissions)
        except UserPermissionCache.DoesNotExist:
            # Compute and cache
            perms = cls.compute_user_permissions(user)
            cls.update_cache(user, perms)
            return cls.get_cached_permissions(user)
