from django.db.models.functions import Lower
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from auth_app.constants import BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER
from auth_app.permissions import HasJWTPermission, add_role_granted

from api.models import ChallengeNode
from api.serializers import (
    ChallengeExplorerSerializer,
    ChallengeNodeSerializer,
    ChallengeNodeWriteSerializer,
)
from api.services.challenge_service import ChallengeService


@add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
class ChallengeNodeViewSet(viewsets.ModelViewSet):
    """ChallengeNode tree CRUD API.

    The challenge tree is a single global file-explorer hierarchy (folder = node,
    CTF = leaf item via OneToOne ``challenge``). Unlike the course tree, challenge
    items are independent, so there is NO manual reorder; siblings are sorted
    folder-first then by case-insensitive title (A->Z).
    """

    # Folder-first (is_item=False before True), then case-insensitive title.
    queryset = (
        ChallengeNode.objects.all()
        .select_related('parent', 'challenge')
        .order_by('is_item', Lower('title'), 'id')
    )
    serializer_class = ChallengeNodeSerializer
    permission_classes = [IsAuthenticated, HasJWTPermission]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            return queryset.filter(parent__isnull=True)
        return queryset

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def create(self, request, *args, **kwargs):
        serializer = ChallengeNodeWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            node = ChallengeService.create_challenge_node_atomic(
                serializer.validated_data, request.user
            )
        except ChallengeNode.DoesNotExist:
            raise ValidationError({'parent_id': 'Invalid parent_id'})
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        response_serializer = ChallengeNodeSerializer(node, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def children(self, request, pk=None):
        node = self.get_object()
        children = node.children.select_related('challenge').order_by('is_item', Lower('title'), 'id')
        serializer = self.get_serializer(children, many=True)
        return Response(serializer.data)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
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
            ChallengeService.move_challenge_node_bulk(node, new_parent)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(node)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
    @action(detail=False, methods=['get'], url_path='explorer')
    def explorer_root(self, request):
        """File-explorer contents at the root (folders + visible challenge items)."""
        return self._explorer_response(request, parent=None)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
    @action(detail=True, methods=['get'], url_path='explorer')
    def explorer_folder(self, request, pk=None):
        """File-explorer contents inside folder ``pk``."""
        node = self.get_object()
        if node.is_item:
            return Response({'folder': None, 'breadcrumb': [], 'nodes': []})
        return self._explorer_response(request, parent=node)

    def _explorer_response(self, request, parent):
        nodes = ChallengeService.list_explorer_children(parent, request.user)
        solved_ids = ChallengeService.solved_challenge_ids(
            request.user, [n.challenge_id for n in nodes if n.challenge_id]
        )
        breadcrumb = ChallengeService.build_breadcrumb(parent)
        serializer = ChallengeExplorerSerializer(
            nodes,
            many=True,
            context={'request': request, 'solved_ids': solved_ids},
        )
        folder_payload = None
        if parent is not None:
            folder_payload = {'id': parent.id, 'title': parent.title, 'path': parent.path}
        return Response(
            {
                'folder': folder_payload,
                'breadcrumb': breadcrumb,
                'nodes': serializer.data,
            }
        )
