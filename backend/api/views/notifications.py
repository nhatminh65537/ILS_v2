from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from auth_app.permissions import HasJWTPermission, add_role_granted

from api.models import Notification
from api.serializers import (
    AdminNotificationHistorySerializer,
    NotificationBroadcastSerializer,
    NotificationSerializer,
    NotificationUnreadCountSerializer,
)
from api.services.notification_service import NotificationService


@add_role_granted('Admin', 'Editor', 'Member')
class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """Notification viewset."""

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated, HasJWTPermission]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('is_read', '-created_at')

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.mark_as_read()
        return Response({'message': 'Marked as read'})

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        updated_count = NotificationService.mark_all_read_for_user(request.user)
        return Response({'updated_count': updated_count})

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        serializer = NotificationUnreadCountSerializer({'count': count})
        return Response(serializer.data)


@add_role_granted('Admin')
class AdminNotificationViewSet(viewsets.GenericViewSet):
    """Admin notification actions."""

    permission_classes = [IsAuthenticated, HasJWTPermission]
    serializer_class = NotificationBroadcastSerializer
    pagination_class = LimitOffsetPagination

    def get_serializer_class(self):
        if self.action == 'history':
            return AdminNotificationHistorySerializer
        return NotificationBroadcastSerializer

    @action(detail=False, methods=['post'], url_path='broadcast')
    def broadcast(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = NotificationService.broadcast_notification(payload=serializer.validated_data, actor=request.user)
        return Response(
            {
                'message': 'Broadcast sent',
                'recipient_count': result['recipient_count'],
                'broadcast_batch_key': result['broadcast_batch_key'],
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['get'], url_path='history')
    def history(self, request):
        history_rows = NotificationService.list_broadcast_history()
        page = self.paginate_queryset(history_rows)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)
