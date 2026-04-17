from datetime import timedelta

import pytest
from django.utils import timezone

from api.models import Notification


@pytest.mark.django_db
class TestNotificationTask91API:
    def test_list_returns_only_current_user_notifications_unread_first(self, member_client, member_user):
        other_user = member_user.__class__.objects.create_user(
            username='notif_other_user',
            password='StrongPass123!',
            email='notif_other@example.com',
        )

        unread_newest = Notification.objects.create(
            user=member_user,
            type=Notification.NotificationType.SYSTEM,
            title='Unread newest',
            message='message',
            is_read=False,
        )
        unread_oldest = Notification.objects.create(
            user=member_user,
            type=Notification.NotificationType.SYSTEM,
            title='Unread oldest',
            message='message',
            is_read=False,
        )
        read_item = Notification.objects.create(
            user=member_user,
            type=Notification.NotificationType.SYSTEM,
            title='Read',
            message='message',
            is_read=True,
            read_at=timezone.now(),
        )
        Notification.objects.create(
            user=other_user,
            type=Notification.NotificationType.SYSTEM,
            title='Other user only',
            message='message',
            is_read=False,
        )

        Notification.objects.filter(pk=unread_oldest.pk).update(created_at=timezone.now() - timedelta(hours=2))
        Notification.objects.filter(pk=read_item.pk).update(created_at=timezone.now() - timedelta(hours=1))

        response = member_client.get('/api/notifications/')

        assert response.status_code == 200
        payload = response.data.get('results', response.data)
        returned_ids = [item['id'] for item in payload]
        assert returned_ids == [unread_newest.id, unread_oldest.id, read_item.id]

    def test_mark_read_marks_single_owned_notification(self, member_client, member_user):
        notification = Notification.objects.create(
            user=member_user,
            type=Notification.NotificationType.COURSE,
            title='Course complete',
            message='Completed',
            is_read=False,
        )

        response = member_client.post(f'/api/notifications/{notification.id}/mark-read/')

        assert response.status_code == 200
        notification.refresh_from_db()
        assert notification.is_read is True
        assert notification.read_at is not None

    def test_mark_read_non_owner_returns_404(self, member_client, member_user):
        other_user = member_user.__class__.objects.create_user(
            username='notif_owner_user',
            password='StrongPass123!',
            email='notif_owner@example.com',
        )
        notification = Notification.objects.create(
            user=other_user,
            type=Notification.NotificationType.SYSTEM,
            title='Private',
            message='Private',
            is_read=False,
        )

        response = member_client.post(f'/api/notifications/{notification.id}/mark-read/')

        assert response.status_code == 404

    def test_mark_all_read_and_unread_count(self, member_client, member_user):
        Notification.objects.create(
            user=member_user,
            type=Notification.NotificationType.SYSTEM,
            title='U1',
            message='U1',
            is_read=False,
        )
        Notification.objects.create(
            user=member_user,
            type=Notification.NotificationType.QUIZ,
            title='U2',
            message='U2',
            is_read=False,
        )
        Notification.objects.create(
            user=member_user,
            type=Notification.NotificationType.ACHIEVEMENT,
            title='R1',
            message='R1',
            is_read=True,
            read_at=timezone.now(),
        )

        before_response = member_client.get('/api/notifications/unread-count/')
        assert before_response.status_code == 200
        assert before_response.data == {'count': 2}

        mark_all_response = member_client.post('/api/notifications/mark-all-read/')
        assert mark_all_response.status_code == 200
        assert mark_all_response.data == {'updated_count': 2}

        after_response = member_client.get('/api/notifications/unread-count/')
        assert after_response.status_code == 200
        assert after_response.data == {'count': 0}

    def test_admin_broadcast_creates_per_active_user_notifications(self, admin_client, admin_user):
        inactive_user = admin_user.__class__.objects.create_user(
            username='notif_inactive_user',
            password='StrongPass123!',
            email='inactive@example.com',
            is_active=False,
        )
        active_member = admin_user.__class__.objects.create_user(
            username='notif_active_member',
            password='StrongPass123!',
            email='active@example.com',
            is_active=True,
        )

        response = admin_client.post(
            '/api/admin/notifications/broadcast/',
            {
                'type': Notification.NotificationType.SYSTEM,
                'title': 'Maintenance',
                'message': 'Scheduled maintenance',
                'metadata': {'scope': 'all-active'},
            },
            format='json',
        )

        assert response.status_code == 201
        assert response.data['recipient_count'] == 2  # admin_user + active_member

        created = Notification.objects.filter(
            is_broadcast=True,
            title='Maintenance',
            message='Scheduled maintenance',
        )
        assert created.count() == 2
        assert not created.filter(user=inactive_user).exists()
        assert created.filter(user=admin_user).exists()
        assert created.filter(user=active_member).exists()

    def test_admin_broadcast_requires_admin_role(self, editor_client, member_client):
        payload = {
            'type': Notification.NotificationType.SYSTEM,
            'title': 'T',
            'message': 'M',
        }

        editor_response = editor_client.post('/api/admin/notifications/broadcast/', payload, format='json')
        member_response = member_client.post('/api/admin/notifications/broadcast/', payload, format='json')

        assert editor_response.status_code == 403
        assert member_response.status_code == 403

    def test_notification_endpoints_require_authentication(self, api_client):
        assert api_client.get('/api/notifications/').status_code == 401
        assert api_client.post('/api/notifications/1/mark-read/').status_code == 401
        assert api_client.post('/api/notifications/mark-all-read/').status_code == 401
        assert api_client.get('/api/notifications/unread-count/').status_code == 401
        assert api_client.post('/api/admin/notifications/broadcast/', {}, format='json').status_code == 401
