"""Permission service for RBAC computation, bitmap encoding, and cache handling."""

import base64
from typing import Iterable, Set

from django.db.models import F

from auth_app.permissions import check_bit_in_bitmap


MAX_PERMISSION_BITS = 256
PERMISSION_BITMAP_BYTES = MAX_PERMISSION_BITS // 8


class PermissionService:
    """Domain service for effective permission computation and token cache lifecycle."""

    @classmethod
    def compute_user_permission_ids(cls, user) -> Set[int]:
        """Compute effective permission IDs using flat role grants and deny-only overrides."""
        from api.models import Permission, UserPermission

        role_ids = user.user_roles.values_list('role_id', flat=True)

        granted_ids = set(
            Permission.objects.filter(
                is_active=True,
                role_permissions__role_id__in=role_ids,
            ).values_list('id', flat=True)
        )

        denied_ids = set(
            UserPermission.objects.filter(
                user=user,
                permission__is_active=True,
            ).values_list('permission_id', flat=True)
        )

        return granted_ids - denied_ids

    @classmethod
    def compute_user_permissions(cls, user) -> Set[str]:
        """Return effective permission names for compatibility with existing domain callers."""
        from api.models import Permission

        permission_ids = cls.compute_user_permission_ids(user)
        if not permission_ids:
            return set()

        return set(
            Permission.objects.filter(id__in=permission_ids).values_list('name', flat=True)
        )

    @classmethod
    def encode_permission_bitmap(cls, permission_ids: Iterable[int]) -> str:
        """Encode permission IDs into a fixed-size base64 bitmap."""
        bitmap = bytearray(PERMISSION_BITMAP_BYTES)

        for permission_id in permission_ids:
            if permission_id < 0 or permission_id >= MAX_PERMISSION_BITS:
                raise ValueError(
                    f'Permission id out of bitmap range 0-{MAX_PERMISSION_BITS - 1}: {permission_id}'
                )

            byte_index = permission_id // 8
            bit_offset = permission_id % 8
            bitmap[byte_index] |= 1 << bit_offset

        return base64.b64encode(bytes(bitmap)).decode('ascii')

    @classmethod
    def get_or_refresh_cache(cls, user) -> str:
        """Get cached encoded bitmap or recompute when cache is missing/stale."""
        from api.models import UserPermissionCache

        try:
            cache = user.permission_cache
            if cache.permission_version == user.permission_version and cache.encoded_permissions:
                return cache.encoded_permissions
        except UserPermissionCache.DoesNotExist:
            pass

        permission_ids = cls.compute_user_permission_ids(user)
        encoded_permissions = cls.encode_permission_bitmap(permission_ids)

        UserPermissionCache.objects.update_or_create(
            user=user,
            defaults={
                'encoded_permissions': encoded_permissions,
                'permission_version': user.permission_version,
            },
        )

        return encoded_permissions

    @classmethod
    def invalidate_cache(cls, user):
        """Invalidate user permission cache by incrementing version and deleting stale bitmap."""
        from api.models import User, UserPermissionCache

        User.objects.filter(pk=user.pk).update(permission_version=F('permission_version') + 1)
        UserPermissionCache.objects.filter(user=user).delete()
        user.refresh_from_db(fields=['permission_version'])

    @classmethod
    def check_permission(cls, user, permission_code: str) -> bool:
        """Check user permission from encoded bitmap cache."""
        from api.models import Permission

        permission = Permission.objects.filter(name=permission_code, is_active=True).first()
        if permission is None:
            return False

        encoded_permissions = cls.get_or_refresh_cache(user)
        return check_bit_in_bitmap(encoded_permissions, permission.id)

    @classmethod
    def get_cached_permissions(cls, user) -> str:
        """Backward-compatible alias returning encoded bitmap string."""
        return cls.get_or_refresh_cache(user)
