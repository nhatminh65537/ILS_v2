import pytest


@pytest.fixture
def rbac_seed(db):
    """Seed built-in roles and sample permissions for RBAC tests."""
    from api.models import Permission, Role, RolePermission

    # Built-in roles may already exist via the autouse discovery fixture.
    admin_role, _ = Role.objects.get_or_create(name='Admin', defaults={'is_system': True})
    editor_role, _ = Role.objects.get_or_create(name='Editor', defaults={'is_system': True})
    member_role, _ = Role.objects.get_or_create(name='Member', defaults={'is_system': True})

    # Create sample permissions (these names are NOT part of URL scan / code registry).
    perms = []
    for name in ('api.config.read', 'api.config.write', 'api.user.read', 'api.user.write'):
        perm, _ = Permission.objects.get_or_create(name=name, defaults={'is_active': True})
        perms.append(perm)

    for perm in perms:
        RolePermission.objects.get_or_create(role=admin_role, permission=perm)

    return {
        'admin_role': admin_role,
        'editor_role': editor_role,
        'member_role': member_role,
        'permissions': perms,
    }
