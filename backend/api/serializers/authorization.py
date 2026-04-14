from rest_framework import serializers

from api.models import Permission, Role, UserRole


class PermissionSerializer(serializers.ModelSerializer):
    """Permission serializer"""

    class Meta:
        model = Permission
        fields = ['id', 'name', 'description', 'is_active']
        read_only_fields = ['id']


class RoleSerializer(serializers.ModelSerializer):
    """Role serializer"""

    permissions = PermissionSerializer(many=True, read_only=True, source='get_all_permissions')

    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'is_system', 'permissions']
        read_only_fields = ['id', 'is_system']


class UserRoleSerializer(serializers.ModelSerializer):
    """User-Role relationship serializer"""

    role_name = serializers.CharField(source='role.name', read_only=True)

    class Meta:
        model = UserRole
        fields = ['id', 'user', 'role', 'role_name', 'created_at']
        read_only_fields = ['id', 'created_at']


class RolePermissionSerializer(serializers.Serializer):
    """Assign or revoke permissions to or from roles."""

    permission_id = serializers.IntegerField(required=True)

    def validate_permission_id(self, value):
        try:
            Permission.objects.get(id=value, is_active=True)
        except Permission.DoesNotExist:
            raise serializers.ValidationError('Permission not found or inactive')
        return value


class PermissionTreeSerializer(serializers.ModelSerializer):
    """Display flat permission list (no hierarchy)."""

    class Meta:
        model = Permission
        fields = ['id', 'name', 'description', 'is_active']
        read_only_fields = ['id', 'name', 'description', 'is_active']


class UserRoleAssignmentSerializer(serializers.Serializer):
    """Assign roles to users."""

    role_id = serializers.IntegerField(required=True)

    def validate_role_id(self, value):
        try:
            Role.objects.get(id=value)
        except Role.DoesNotExist:
            raise serializers.ValidationError('Role not found')
        return value
