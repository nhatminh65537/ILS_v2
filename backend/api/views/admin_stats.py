from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from auth_app.constants import BUILTIN_ROLE_ADMIN
from auth_app.permissions import HasJWTPermission, add_role_granted

from api.serializers import AdminStatsOverviewSerializer, AdminStatsUserDetailSerializer
from api.services.admin_stats_service import AdminStatsService


@add_role_granted(BUILTIN_ROLE_ADMIN)
class AdminStatsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, HasJWTPermission]

    def list(self, request):
        payload = AdminStatsService.build_overview()
        serializer = AdminStatsOverviewSerializer(payload)
        return Response(serializer.data)

    def user_detail(self, request, user_id=None):
        payload = AdminStatsService.build_user_detail(user_id)
        serializer = AdminStatsUserDetailSerializer(payload)
        return Response(serializer.data)