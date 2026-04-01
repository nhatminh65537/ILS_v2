from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from auth_app.permissions import add_role_granted

from api.services.leaderboard_service import LeaderboardService


@add_role_granted('Admin', 'Editor', 'Member')
class LeaderboardViewSet(viewsets.ViewSet):
    """Leaderboard viewset."""

    permission_classes = [IsAuthenticated]

    def list(self, request):
        board_type = request.query_params.get('type', 'lpoint')
        limit = int(request.query_params.get('limit', 50))
        data = LeaderboardService.get_leaderboard(board_type, limit)
        return Response(data)
