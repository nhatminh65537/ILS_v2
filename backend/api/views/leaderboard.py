from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from auth_app.constants import BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER
from auth_app.permissions import HasJWTPermission, add_role_granted

from api.serializers import LeaderboardResponseSerializer
from api.services.leaderboard_service import LeaderboardService


@add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
class LeaderboardViewSet(viewsets.ViewSet):
    """Leaderboard viewset."""

    permission_classes = [IsAuthenticated, HasJWTPermission]

    def list(self, request):
        board_type = request.query_params.get('type') or request.query_params.get('sort_by') or 'overall'
        page = request.query_params.get('page', 1)
        limit = request.query_params.get('limit')
        offset = request.query_params.get('offset')

        payload = LeaderboardService.build_leaderboard(
            board_type,
            user=request.user,
            page=page,
            limit=limit,
            offset=offset,
        )
        serializer = LeaderboardResponseSerializer(payload)
        return Response(serializer.data)
