from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from auth_app.constants import BUILTIN_ROLE_ADMIN
from auth_app.permissions import HasJWTPermission, add_role_granted

from ..models import Permission
from ..serializers import PermissionTreeSerializer


@add_role_granted(BUILTIN_ROLE_ADMIN)
class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    """Permission viewset (read-only per R-AUTH-08)."""

    queryset = Permission.objects.all().order_by('id')
    serializer_class = PermissionTreeSerializer
    permission_classes = [IsAuthenticated, HasJWTPermission]

    def get_queryset(self):
        queryset = Permission.objects.all().order_by('id')
        show_inactive = self.request.query_params.get('include_inactive', 'false').lower() == 'true'
        if not show_inactive:
            queryset = queryset.filter(is_active=True)
        return queryset
