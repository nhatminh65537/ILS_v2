from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from auth_app.permissions import HasJWTPermission, add_role_granted

from ..models import Permission, Role, RolePermission
from ..serializers import PermissionTreeSerializer, RolePermissionSerializer, RoleSerializer
from ..services.permission_service import PermissionService


@add_role_granted('Admin')
class RoleViewSet(viewsets.ModelViewSet):
    """Role CRUD viewset."""

    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated, HasJWTPermission]

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
