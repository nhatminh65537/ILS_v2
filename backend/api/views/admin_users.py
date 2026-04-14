from datetime import datetime, time

from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import mixins, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from auth_app.permissions import HasJWTPermission, add_role_granted

from ..models import Role, User, UserRole
from ..serializers import (
    AdminUserManagementSerializer,
    UserRoleAssignmentSerializer,
    UserRoleSerializer,
)
from ..services.permission_service import PermissionService


@add_role_granted('Admin')
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

        is_active = self.request.query_params.get('is_active')
        if is_active is not None and is_active != '':
            normalized = is_active.strip().lower()
            if normalized not in {'true', 'false', '1', '0'}:
                raise ValidationError({'is_active': 'Use true or false.'})
            queryset = queryset.filter(is_active=normalized in {'true', '1'})

        date_joined_from = self._parse_joined_filter(self.request.query_params.get('date_joined_from'))
        date_joined_to = self._parse_joined_filter(self.request.query_params.get('date_joined_to'), end_of_day=True)

        if date_joined_from is not None:
            queryset = queryset.filter(date_joined__gte=date_joined_from)
        if date_joined_to is not None:
            queryset = queryset.filter(date_joined__lte=date_joined_to)

        return queryset

    @staticmethod
    def _parse_joined_filter(value, *, end_of_day=False):
        if not value:
            return None

        parsed_datetime = parse_datetime(value)
        if parsed_datetime is not None:
            candidate = parsed_datetime
        else:
            parsed_date = parse_date(value)
            if parsed_date is None:
                raise ValidationError({'date_joined': 'Use YYYY-MM-DD or an ISO datetime string.'})
            candidate = datetime.combine(parsed_date, time.max if end_of_day else time.min)

        if timezone.is_naive(candidate):
            candidate = timezone.make_aware(candidate, timezone.get_current_timezone())

        return candidate


@add_role_granted('Admin')
class UserRoleViewSet(viewsets.ViewSet):
    """User role assignment viewset."""

    permission_classes = [IsAuthenticated, HasJWTPermission]

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
