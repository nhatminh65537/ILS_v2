import pytest
from django.contrib.auth import get_user_model

from api.models import Permission, Role, RolePermission, SystemConfig
from auth_app.services.permission_discovery import discover_permissions


User = get_user_model()


@pytest.mark.django_db
class TestPermissionDiscovery:
    def test_discovery_creates_lowercase_permission_names(self):
        discover_permissions()

        assert Permission.objects.filter(name='api.course.list', is_active=True).exists()
        assert Permission.objects.filter(name='api.course.tree', is_active=True).exists()
        assert Permission.objects.filter(name='api.learn_challenge.list', is_active=True).exists()
        assert Permission.objects.filter(name='api.system_config.update', is_active=True).exists()

    def test_discovery_is_idempotent(self):
        discover_permissions()
        first_permission_count = Permission.objects.count()
        first_link_count = RolePermission.objects.count()

        discover_permissions()
        second_permission_count = Permission.objects.count()
        second_link_count = RolePermission.objects.count()

        assert first_permission_count == second_permission_count
        assert first_link_count == second_link_count

    def test_discovery_marks_stale_permissions_inactive(self):
        stale = Permission.objects.create(
            name='api.legacy.old_handler',
            description='Legacy endpoint',
            is_active=True,
        )

        discover_permissions()
        stale.refresh_from_db()

        assert stale.is_active is False

    def test_discovery_syncs_roles_and_mappings(self):
        discover_permissions()

        admin = Role.objects.get(name='Admin')
        editor = Role.objects.get(name='Editor')
        member = Role.objects.get(name='Member')

        for role in [admin, editor, member]:
            assert role.is_system is True

        list_permission = Permission.objects.get(name='api.course.list')
        assert RolePermission.objects.filter(role=member, permission=list_permission).exists()

        tree_permission = Permission.objects.get(name='api.course.tree')
        assert RolePermission.objects.filter(role=admin, permission=tree_permission).exists()
        assert RolePermission.objects.filter(role=editor, permission=tree_permission).exists()
        assert not RolePermission.objects.filter(role=member, permission=tree_permission).exists()

        create_permission = Permission.objects.get(name='api.course.create')
        assert RolePermission.objects.filter(role=admin, permission=create_permission).exists()
        assert RolePermission.objects.filter(role=editor, permission=create_permission).exists()
        assert not RolePermission.objects.filter(role=member, permission=create_permission).exists()


@pytest.mark.django_db
class TestJWTPermission:
    """Tests for HasJWTPermission class and bitmap checking."""

    def test_check_bit_in_bitmap_set_bit(self):
        from auth_app.permissions import check_bit_in_bitmap
        import base64

        bitmap = bytearray(32)
        bitmap[0] = 0b00001001
        bitmap_b64 = base64.b64encode(bytes(bitmap)).decode('utf-8')

        assert check_bit_in_bitmap(bitmap_b64, 0) is True
        assert check_bit_in_bitmap(bitmap_b64, 3) is True
        assert check_bit_in_bitmap(bitmap_b64, 1) is False
        assert check_bit_in_bitmap(bitmap_b64, 2) is False

    def test_check_bit_in_bitmap_empty(self):
        from auth_app.permissions import check_bit_in_bitmap
        import base64

        bitmap = bytearray(32)
        bitmap_b64 = base64.b64encode(bytes(bitmap)).decode('utf-8')

        assert check_bit_in_bitmap(bitmap_b64, 0) is False
        assert check_bit_in_bitmap(bitmap_b64, 255) is False

    def test_check_bit_in_bitmap_out_of_range(self):
        from auth_app.permissions import check_bit_in_bitmap
        import base64

        bitmap = bytearray(32)
        bitmap_b64 = base64.b64encode(bytes(bitmap)).decode('utf-8')

        with pytest.raises(ValueError):
            check_bit_in_bitmap(bitmap_b64, 256)

        with pytest.raises(ValueError):
            check_bit_in_bitmap(bitmap_b64, -1)

    def test_check_bit_in_bitmap_invalid_b64(self):
        from auth_app.permissions import check_bit_in_bitmap

        assert check_bit_in_bitmap('invalid!!!', 0) is False
        assert check_bit_in_bitmap('', 0) is False

    def test_check_bit_in_bitmap_byte_boundary(self):
        from auth_app.permissions import check_bit_in_bitmap
        import base64

        bitmap = bytearray(32)
        bitmap[0] = 0xFF
        bitmap[1] = 0x00
        bitmap_b64 = base64.b64encode(bytes(bitmap)).decode('utf-8')

        for i in range(8):
            assert check_bit_in_bitmap(bitmap_b64, i) is True

        for i in range(8, 16):
            assert check_bit_in_bitmap(bitmap_b64, i) is False

    def test_has_jwt_permission_allows_authenticated_with_bypass_disabled(self, api_client, member_user):
        from auth_app.permissions import HasJWTPermission
        from unittest.mock import Mock

        SystemConfig.objects.create(
            key='auth.authorization_enabled',
            value=False,
            value_type=SystemConfig.ConfigType.BOOL,
            category='auth',
            is_runtime=True,
            is_editable=True,
        )

        permission = HasJWTPermission('api.nonexistent.perm')
        request = Mock()
        request.user = member_user
        request.auth = None

        assert permission.has_permission(request, Mock()) is True

    def test_has_jwt_permission_checks_bitmap_when_authz_enabled(self, api_client, member_user):
        from auth_app.permissions import HasJWTPermission
        from unittest.mock import Mock
        import base64

        test_perm = Permission.objects.create(
            name='api.test.check',
            description='Test permission',
            is_active=True,
        )

        SystemConfig.objects.create(
            key='auth.authorization_enabled',
            value=True,
            value_type=SystemConfig.ConfigType.BOOL,
            category='auth',
            is_runtime=True,
            is_editable=True,
        )

        bitmap = bytearray(32)
        bitmap[test_perm.id // 8] |= (1 << (test_perm.id % 8))
        bitmap_b64 = base64.b64encode(bytes(bitmap)).decode('utf-8')

        permission = HasJWTPermission('api.test.check')
        request = Mock()
        request.user = member_user
        request.auth = {'permissions': bitmap_b64}

        assert permission.has_permission(request, Mock()) is True

    def test_has_jwt_permission_denies_missing_permission(self, api_client, member_user):
        from auth_app.permissions import HasJWTPermission
        from unittest.mock import Mock
        import base64

        Permission.objects.create(
            name='api.test.denied',
            description='Test permission',
            is_active=True,
        )

        SystemConfig.objects.create(
            key='auth.authorization_enabled',
            value=True,
            value_type=SystemConfig.ConfigType.BOOL,
            category='auth',
            is_runtime=True,
            is_editable=True,
        )

        bitmap = bytearray(32)
        bitmap_b64 = base64.b64encode(bytes(bitmap)).decode('utf-8')

        permission = HasJWTPermission('api.test.denied')
        request = Mock()
        request.user = member_user
        request.auth = {'permissions': bitmap_b64}

        assert permission.has_permission(request, Mock()) is False

    def test_has_jwt_permission_denies_unauthenticated(self, api_client):
        from auth_app.permissions import HasJWTPermission
        from unittest.mock import Mock

        permission = HasJWTPermission('api.test.perm')
        request = Mock()
        request.user = None

        assert permission.has_permission(request, Mock()) is False

    def test_has_jwt_permission_allows_no_specific_permission(self, api_client, member_user):
        from auth_app.permissions import HasJWTPermission
        from unittest.mock import Mock

        permission = HasJWTPermission(None)
        request = Mock()
        request.user = member_user

        assert permission.has_permission(request, Mock()) is True

    def test_has_jwt_permission_handles_nonexistent_permission(self, api_client, member_user):
        from auth_app.permissions import HasJWTPermission
        from unittest.mock import Mock
        import base64

        SystemConfig.objects.create(
            key='auth.authorization_enabled',
            value=True,
            value_type=SystemConfig.ConfigType.BOOL,
            category='auth',
            is_runtime=True,
            is_editable=True,
        )

        bitmap = bytearray(32)
        bitmap_b64 = base64.b64encode(bytes(bitmap)).decode('utf-8')

        permission = HasJWTPermission('api.nonexistent.perm')
        request = Mock()
        request.user = member_user
        request.auth = {'permissions': bitmap_b64}

        assert permission.has_permission(request, Mock()) is False
