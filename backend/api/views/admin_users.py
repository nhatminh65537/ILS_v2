from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from auth_app.constants import BUILTIN_ROLE_ADMIN
from auth_app.permissions import HasJWTPermission, add_role_granted

from ..models import Role, User, UserRole
from ..serializers import (
    AdminUserManagementSerializer,
    UserRoleAssignmentSerializer,
    UserRoleSerializer,
)
from ..services.admin_user_service import AdminUserService


@add_role_granted(BUILTIN_ROLE_ADMIN)
class AdminUserViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Admin user management viewset."""

    queryset = User.objects.all()
    serializer_class = AdminUserManagementSerializer
    permission_classes = [IsAuthenticated, HasJWTPermission]

    def get_queryset(self):
        queryset = User.objects.select_related('profile').prefetch_related('user_roles__role').order_by('id')
        return AdminUserService.apply_filters(queryset, self.request.query_params)


@add_role_granted(BUILTIN_ROLE_ADMIN)
class UserRoleViewSet(viewsets.ViewSet):
    """User role assignment viewset."""

    permission_classes = [IsAuthenticated, HasJWTPermission]

    def get_user(self, user_id):
        return get_object_or_404(User, id=user_id)

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
            user_role, created = AdminUserService.assign_role(user, role_id)
            response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK

            result_serializer = UserRoleSerializer(user_role)
            return Response(result_serializer.data, status=response_status)
        except Role.DoesNotExist:
            return Response({'detail': 'Role not found'}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, user_id, role_id):
        user = self.get_user(user_id)
        try:
            AdminUserService.remove_role(user, role_id)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except UserRole.DoesNotExist:
            return Response(
                {'detail': 'User does not have this role'},
                status=status.HTTP_404_NOT_FOUND,
            )
