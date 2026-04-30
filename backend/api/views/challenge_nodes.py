from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from auth_app.permissions import HasJWTPermission, add_role_granted

from api.models import ChallengeNode
from api.serializers import ChallengeNodeSerializer


@add_role_granted('Admin', 'Editor', 'Member')
class ChallengeNodeViewSet(viewsets.ModelViewSet):
    """ChallengeNode tree CRUD API."""

    queryset = ChallengeNode.objects.all().select_related('parent', 'challenge').order_by('position', 'id')
    serializer_class = ChallengeNodeSerializer
    permission_classes = [IsAuthenticated, HasJWTPermission]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            return queryset.filter(parent__isnull=True)
        return queryset

    @add_role_granted('Admin', 'Editor')
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @add_role_granted('Admin', 'Editor')
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @add_role_granted('Admin', 'Editor')
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @add_role_granted('Admin', 'Editor')
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def children(self, request, pk=None):
        node = self.get_object()
        serializer = self.get_serializer(node.children.order_by('position', 'id'), many=True)
        return Response(serializer.data)

    @add_role_granted('Admin', 'Editor')
    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        node = self.get_object()
        parent_id = request.data.get('parent_id')

        if parent_id in (None, ''):
            new_parent = None
        else:
            new_parent = get_object_or_404(ChallengeNode, id=parent_id)

        if new_parent and new_parent.is_item:
            return Response(
                {'detail': 'Item nodes cannot have children.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            node.move_to(new_parent)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(node)
        return Response(serializer.data, status=status.HTTP_200_OK)
