from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from auth_app.permissions import add_role_granted

from api.models import Notification
from api.serializers import NotificationSerializer


@add_role_granted('Admin', 'Editor', 'Member')
class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """Notification viewset."""

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(Q(user=self.request.user) | Q(is_broadcast=True))

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.mark_as_read()
        return Response({'message': 'Marked as read'})
