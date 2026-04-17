from django.db import transaction
from django.utils import timezone

from api.models import Notification, User


class NotificationService:
    """Domain service for notification operations."""

    @staticmethod
    @transaction.atomic
    def create_notification(*, user, type, title, message, metadata=None, event_key=None, is_broadcast=False):
        """Create a notification, deduplicating auto notifications by event_key."""
        defaults = {
            'type': type,
            'title': title,
            'message': message,
            'metadata': metadata,
            'is_broadcast': is_broadcast,
        }

        if event_key is None:
            return Notification.objects.create(user=user, event_key=None, **defaults)

        notification, _ = Notification.objects.get_or_create(
            user=user,
            event_key=event_key,
            defaults=defaults,
        )
        return notification

    @staticmethod
    def mark_all_read_for_user(user):
        """Mark all unread notifications as read for a user and return updated count."""
        now = timezone.now()
        return Notification.objects.filter(user=user, is_read=False).update(is_read=True, read_at=now)

    @staticmethod
    @transaction.atomic
    def broadcast_notification(*, payload):
        """Broadcast a notification to all active users.

        Returns the number of recipient records created.
        """
        active_user_ids = list(User.objects.filter(is_active=True).values_list('id', flat=True))
        if not active_user_ids:
            return 0

        notifications = [
            Notification(
                user_id=user_id,
                type=payload['type'],
                title=payload['title'],
                message=payload['message'],
                metadata=payload.get('metadata'),
                is_broadcast=True,
            )
            for user_id in active_user_ids
        ]

        Notification.objects.bulk_create(notifications)
        return len(notifications)