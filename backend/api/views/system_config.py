from rest_framework import mixins, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from auth_app.permissions import HasJWTPermission, add_role_granted

from ..models import SystemConfig
from ..serializers import SystemConfigSerializer
from ..utils import invalidate_config_cache


@add_role_granted('Admin')
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
