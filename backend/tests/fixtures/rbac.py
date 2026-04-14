import pytest


@pytest.fixture
def rbac_seed(db):
    """Seed built-in roles and sample permissions for RBAC tests."""
    from api.models import Permission, Role, RolePermission

    # Create built-in roles (matches Task 2.1 auto-discovery)
    admin_role = Role.objects.create(name='Admin', is_system=True)
    editor_role = Role.objects.create(name='Editor', is_system=True)
    member_role = Role.objects.create(name='Member', is_system=True)

    # Create sample permissions
    perms = [
        Permission.objects.create(name='api.config.read', is_active=True),
        Permission.objects.create(name='api.config.write', is_active=True),
        Permission.objects.create(name='api.user.read', is_active=True),
        Permission.objects.create(name='api.user.write', is_active=True),
    ]

    # Assign permissions to Admin role
    for perm in perms:
        RolePermission.objects.create(role=admin_role, permission=perm)

    return {
        'admin_role': admin_role,
        'editor_role': editor_role,
        'member_role': member_role,
        'permissions': perms,
    }
