from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from auth_app.permissions import add_role_granted

from .mixins.rbac_action_permission import RBACActionPermissionMixin
from .models import Permission, Role, RolePermission, SystemConfig, UserRole
from .serializers import (
    PermissionTreeSerializer,
    RolePermissionSerializer,
    RoleSerializer,
    SystemConfigSerializer,
    UserRoleAssignmentSerializer,
    UserRoleSerializer,
)
from .services.permission_service import PermissionService
from .utils import invalidate_config_cache


@add_role_granted('Admin')
class SystemConfigViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """System configuration viewset."""

    serializer_class = SystemConfigSerializer
    permission_classes = [permissions.IsAdminUser]
    lookup_field = 'key'
    lookup_url_kwarg = 'key'
    lookup_value_regex = '[^/]+'

    def get_queryset(self):
        return SystemConfig.objects.all().order_by('category', 'key')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        grouped = {}

        for config in queryset:
            category = config.category or 'uncategorized'
            grouped.setdefault(category, []).append(self.get_serializer(config).data)

        return Response(grouped)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if not instance.is_editable:
            return Response(
                {'detail': 'Config is not editable'},
                status=status.HTTP_403_FORBIDDEN,
            )

        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        invalidate_config_cache(instance.key)

        return Response(serializer.data)


@add_role_granted('Admin')
class PermissionViewSet(RBACActionPermissionMixin, viewsets.ReadOnlyModelViewSet):
    """Permission viewset (read-only per R-AUTH-08)."""

    queryset = Permission.objects.all().order_by('id')
    serializer_class = PermissionTreeSerializer
    permission_classes = [IsAuthenticated, permissions.IsAdminUser]

    action_permission_map = {
        'list': 'api.permission.list',
        'retrieve': 'api.permission.retrieve',
    }

    def get_queryset(self):
        queryset = Permission.objects.all().order_by('id')
        show_inactive = self.request.query_params.get('include_inactive', 'false').lower() == 'true'
        if not show_inactive:
            queryset = queryset.filter(is_active=True)
        return queryset


@add_role_granted('Admin')
class RoleViewSet(RBACActionPermissionMixin, viewsets.ModelViewSet):
    """Role CRUD viewset."""

    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated, permissions.IsAdminUser]

    action_permission_map = {
        'list': 'api.role.list',
        'retrieve': 'api.role.retrieve',
        'create': 'api.role.create',
        'update': 'api.role.update',
        'partial_update': 'api.role.partial_update',
        'destroy': 'api.role.destroy',
        'permissions': 'api.role.permissions',
        'revoke_permission': 'api.role.revoke_permission',
    }

    def get_queryset(self):
        return Role.objects.all().order_by('name')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_system and 'name' in request.data and request.data['name'] != instance.name:
            return Response(
                {'detail': 'System roles cannot be renamed'},
                status=status.HTTP_403_FORBIDDEN,
            )

        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_system:
            return Response(
                {'detail': 'System roles cannot be deleted'},
                status=status.HTTP_403_FORBIDDEN,
            )

        self._invalidate_role_users_cache(instance)
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get', 'post'])
    def permissions(self, request, pk=None):
        role = self.get_object()

        if request.method.lower() == 'post':
            return self._assign_permission(request, role)

        permissions_qs = role.get_all_permissions()
        serializer = PermissionTreeSerializer(permissions_qs, many=True)
        return Response(serializer.data)

    def _assign_permission(self, request, role):
        serializer = RolePermissionSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        permission_id = serializer.validated_data['permission_id']
        try:
            permission = Permission.objects.get(id=permission_id)
            _, created = RolePermission.objects.get_or_create(role=role, permission=permission)

            if created:
                self._invalidate_role_users_cache(role)

            return Response({'detail': 'Permission assigned'}, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    def _invalidate_role_users_cache(self, role):
        for user_role in role.users.select_related('user').all():
            PermissionService.invalidate_cache(user_role.user)

    @action(detail=True, methods=['delete'], url_path=r'permissions/(?P<perm_id>\d+)')
    def revoke_permission(self, request, pk=None, perm_id=None):
        role = self.get_object()
        try:
            role_perm = RolePermission.objects.get(role=role, permission_id=perm_id)
            role_perm.delete()

            self._invalidate_role_users_cache(role)

            return Response(status=status.HTTP_204_NO_CONTENT)
        except RolePermission.DoesNotExist:
            return Response(
                {'detail': 'Permission not assigned to this role'},
                status=status.HTTP_404_NOT_FOUND,
            )


@add_role_granted('Admin')
class UserRoleViewSet(RBACActionPermissionMixin, viewsets.ViewSet):
    """User role assignment viewset."""

    permission_classes = [IsAuthenticated, permissions.IsAdminUser]

    action_permission_map = {
        'list': 'api.user_role.list',
        'create': 'api.user_role.create',
        'destroy': 'api.user_role.destroy',
    }

    def get_user(self, user_id):
        user_model = get_user_model()
        return get_object_or_404(user_model, id=user_id)

    def list(self, request, user_id):
        user = self.get_user(user_id)
        user_roles = UserRole.objects.filter(user=user)
        serializer = UserRoleSerializer(user_roles, many=True)
        return Response(serializer.data)

    def create(self, request, user_id):
        user = self.get_user(user_id)
        serializer = UserRoleAssignmentSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        role_id = serializer.validated_data['role_id']
        try:
            role = Role.objects.get(id=role_id)
            user_role, created = UserRole.objects.get_or_create(user=user, role=role)

            if created:
                PermissionService.invalidate_cache(user)
                response_status = status.HTTP_201_CREATED
            else:
                response_status = status.HTTP_200_OK

            result_serializer = UserRoleSerializer(user_role)
            return Response(result_serializer.data, status=response_status)
        except Exception as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, user_id, role_id):
        user = self.get_user(user_id)
        try:
            user_role = UserRole.objects.get(user=user, role_id=role_id)
            user_role.delete()

            PermissionService.invalidate_cache(user)

            return Response(status=status.HTTP_204_NO_CONTENT)
        except UserRole.DoesNotExist:
            return Response(
                {'detail': 'User does not have this role'},
                status=status.HTTP_404_NOT_FOUND,
            )
