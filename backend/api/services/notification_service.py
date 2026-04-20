from django.db import transaction
from django.db.models import Count, Max
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import uuid

from api.models import Notification, User


class NotificationService:
    """Domain service for notification operations."""

    @staticmethod
    def _serialize_notification_payload(notification):
        """Build deterministic payload shape for realtime notification events."""
        return {
            'id': notification.id,
            'type': notification.type,
            'title': notification.title,
            'message': notification.message,
            'metadata': notification.metadata,
            'is_read': notification.is_read,
            'read_at': notification.read_at.isoformat() if notification.read_at else None,
            'created_at': notification.created_at.isoformat() if notification.created_at else None,
        }

    @staticmethod
    def push_notification_realtime(*, user_id, payload):
        """Push notification payload to authenticated WebSocket clients of a user."""
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return

        async_to_sync(channel_layer.group_send)(
            f'notifications_{user_id}',
            {
                'type': 'notification_send',
                'data': payload,
            },
        )

    @staticmethod
    @transaction.atomic
    def create_notification(
        *,
        user,
        type,
        title,
        message,
        metadata=None,
        event_key=None,
        is_broadcast=False,
        return_created=False,
    ):
        """Create a notification, deduplicating auto notifications by event_key."""
        defaults = {
            'type': type,
            'title': title,
            'message': message,
            'metadata': metadata,
            'is_broadcast': is_broadcast,
        }

        if event_key is None:
            notification = Notification.objects.create(user=user, event_key=None, **defaults)
            created = True
        else:
            notification, created = Notification.objects.get_or_create(
                user=user,
                event_key=event_key,
                defaults=defaults,
            )

        if created and notification.user_id:
            payload = NotificationService._serialize_notification_payload(notification)
            transaction.on_commit(
                lambda: NotificationService.push_notification_realtime(
                    user_id=notification.user_id,
                    payload=payload,
                )
            )

        if return_created:
            return notification, created
        return notification

    @staticmethod
    def mark_all_read_for_user(user):
        """Mark all unread notifications as read for a user and return updated count."""
        now = timezone.now()
        return Notification.objects.filter(user=user, is_read=False).update(is_read=True, read_at=now)

    @staticmethod
    @transaction.atomic
    def broadcast_notification(*, payload, actor):
        """Broadcast a notification to all active users.

        Returns metadata for created recipient records.
        """
        broadcast_batch_key = f'broadcast:{uuid.uuid4()}'
        active_user_ids = list(User.objects.filter(is_active=True).values_list('id', flat=True))
        if not active_user_ids:
            return {
                'recipient_count': 0,
                'broadcast_batch_key': broadcast_batch_key,
            }

        notifications = [
            Notification(
                user_id=user_id,
                type=payload['type'],
                title=payload['title'],
                message=payload['message'],
                metadata=payload.get('metadata'),
                event_key=broadcast_batch_key,
                is_broadcast=True,
                created_by_id=actor.id,
            )
            for user_id in active_user_ids
        ]

        created_notifications = Notification.objects.bulk_create(notifications)

        for notification in created_notifications:
            if not notification.user_id:
                continue
            payload_data = NotificationService._serialize_notification_payload(notification)
            transaction.on_commit(
                lambda uid=notification.user_id, pdata=payload_data: NotificationService.push_notification_realtime(
                    user_id=uid,
                    payload=pdata,
                )
            )

        return {
            'recipient_count': len(created_notifications),
            'broadcast_batch_key': broadcast_batch_key,
        }

    @staticmethod
    def list_broadcast_history():
        """Return grouped broadcast history rows for admin UI."""
        return (
            Notification.objects.filter(
                is_broadcast=True,
                event_key__startswith='broadcast:',
            )
            .values(
                'event_key',
                'type',
                'title',
                'message',
                'metadata',
                'created_by_id',
                'created_by__username',
                'created_by__email',
            )
            .annotate(
                recipient_count=Count('id'),
                sent_at=Max('created_at'),
            )
            .order_by('-sent_at')
        )