from rest_framework import mixins, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from auth_app.constants import BUILTIN_ROLE_ADMIN
from auth_app.permissions import HasJWTPermission, add_role_granted

from ..models import SystemConfig
from ..serializers import SystemConfigSerializer
from ..services.system_config_service import SystemConfigService


@add_role_granted(BUILTIN_ROLE_ADMIN)
class SystemConfigViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """System configuration viewset."""

    serializer_class = SystemConfigSerializer
    permission_classes = [IsAuthenticated, HasJWTPermission]
    lookup_field = 'key'
    lookup_url_kwarg = 'key'
    lookup_value_regex = '[^/]+'

    def get_queryset(self):
        return SystemConfig.objects.all().order_by('category', 'key')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        grouped = SystemConfigService.group_by_category(queryset, self.get_serializer)
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
        data = SystemConfigService.update_config(instance, serializer)
        return Response(data)
