import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import User, Role, UserRole

admin = User.objects.get(username='admin')
print(f'Admin user: {admin.username} (id={admin.id})')
print(f'Is staff: {admin.is_staff}')
print(f'Is superuser: {admin.is_superuser}')

roles = UserRole.objects.filter(user=admin)
print(f'\nRoles count: {roles.count()}')
for ur in roles:
    perms = ur.role.role_permissions.all()
    print(f'  - Role: {ur.role.name} (permissions={perms.count()})')

# Check for specific permission
admin_role = UserRole.objects.get(user=admin).role
perm_names = [rp.permission.name for rp in admin_role.role_permissions.all()]
print(f'\nAdmin role permissions (59):')
for p in sorted(perm_names):
    print(f'  - {p}')

print(f'\nLooking for "api.permission.list": {"api.permission.list" in perm_names}')
