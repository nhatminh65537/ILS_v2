"""Async integration tests for notification WebSocket consumer."""

import pytest
from channels.db import database_sync_to_async
from channels.routing import URLRouter
from channels.testing.websocket import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.urls import path
from rest_framework_simplejwt.tokens import RefreshToken

from api.services.notification_service import NotificationService


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_notification_ws_auth_timeout():
    communicator = WebsocketCommunicator(_get_consumer_asgi(), '/ws/notifications/')
    connected, _ = await communicator.connect()
    assert connected

    close_event = await communicator.receive_output(timeout=6)
    assert close_event['type'] == 'websocket.close'
    assert close_event['code'] == 4008


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_notification_ws_auth_failed_with_invalid_token():
    communicator = WebsocketCommunicator(_get_consumer_asgi(), '/ws/notifications/')
    connected, _ = await communicator.connect()
    assert connected

    await communicator.send_json_to({'type': 'auth', 'token': 'invalid-token'})
    close_event = await communicator.receive_output(timeout=2)

    assert close_event['type'] == 'websocket.close'
    assert close_event['code'] == 4001


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_notification_ws_auth_ok_and_receive_push(member_user):
    access_token = await _build_access_token(member_user)

    communicator = WebsocketCommunicator(_get_consumer_asgi(), '/ws/notifications/')
    connected, _ = await communicator.connect()
    assert connected

    await communicator.send_json_to({'type': 'auth', 'token': access_token})
    auth_response = await communicator.receive_json_from()

    assert auth_response['type'] == 'auth_ok'
    assert auth_response['user_id'] == member_user.id

    await database_sync_to_async(NotificationService.create_notification)(
        user=member_user,
        type='system',
        title='Realtime test',
        message='Hello websocket',
        metadata={'source': 'test'},
    )

    event = await communicator.receive_json_from(timeout=2)
    assert event['type'] == 'notification'
    assert event['data']['title'] == 'Realtime test'
    assert event['data']['message'] == 'Hello websocket'
    assert event['data']['type'] == 'system'

    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_notification_ws_isolation_between_users(member_user):
    other_user = await _create_user('notif_other', 'notif_other@example.com')

    member_token = await _build_access_token(member_user)
    other_token = await _build_access_token(other_user)

    member_ws = WebsocketCommunicator(_get_consumer_asgi(), '/ws/notifications/')
    other_ws = WebsocketCommunicator(_get_consumer_asgi(), '/ws/notifications/')

    connected_member, _ = await member_ws.connect()
    connected_other, _ = await other_ws.connect()
    assert connected_member and connected_other

    await member_ws.send_json_to({'type': 'auth', 'token': member_token})
    await other_ws.send_json_to({'type': 'auth', 'token': other_token})

    await member_ws.receive_json_from()
    await other_ws.receive_json_from()

    await database_sync_to_async(NotificationService.create_notification)(
        user=member_user,
        type='system',
        title='Only member',
        message='member-only message',
        metadata={'target': 'member'},
    )

    member_event = await member_ws.receive_json_from(timeout=2)
    assert member_event['type'] == 'notification'
    assert member_event['data']['title'] == 'Only member'

    no_message_for_other = await other_ws.receive_nothing(timeout=0.3)
    assert no_message_for_other is True

    await member_ws.disconnect()
    await other_ws.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_notification_ws_rejects_non_auth_message_before_auth():
    communicator = WebsocketCommunicator(_get_consumer_asgi(), '/ws/notifications/')
    connected, _ = await communicator.connect()
    assert connected

    await communicator.send_json_to({'action': 'ping'})
    response = await communicator.receive_json_from(timeout=2)

    assert response['type'] == 'error'
    assert response['code'] == 'not_authenticated'

    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_notification_ws_broadcast_fanout_to_active_connections(member_user):
    second_user = await _create_user('notif_second', 'notif_second@example.com')

    member_token = await _build_access_token(member_user)
    second_token = await _build_access_token(second_user)

    member_ws = WebsocketCommunicator(_get_consumer_asgi(), '/ws/notifications/')
    second_ws = WebsocketCommunicator(_get_consumer_asgi(), '/ws/notifications/')

    connected_member, _ = await member_ws.connect()
    connected_second, _ = await second_ws.connect()
    assert connected_member and connected_second

    await member_ws.send_json_to({'type': 'auth', 'token': member_token})
    await second_ws.send_json_to({'type': 'auth', 'token': second_token})

    await member_ws.receive_json_from()
    await second_ws.receive_json_from()

    await database_sync_to_async(NotificationService.broadcast_notification)(
        payload={
            'type': 'system',
            'title': 'Broadcast WS',
            'message': 'Broadcast delivery test',
            'metadata': {'kind': 'broadcast-test'},
        }
    )

    member_event = await member_ws.receive_json_from(timeout=2)
    second_event = await second_ws.receive_json_from(timeout=2)

    assert member_event['type'] == 'notification'
    assert second_event['type'] == 'notification'
    assert member_event['data']['title'] == 'Broadcast WS'
    assert second_event['data']['title'] == 'Broadcast WS'
    assert member_event['data']['metadata']['kind'] == 'broadcast-test'
    assert second_event['data']['metadata']['kind'] == 'broadcast-test'

    await member_ws.disconnect()
    await second_ws.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_notification_ws_dedup_event_key_does_not_reemit(member_user):
    access_token = await _build_access_token(member_user)

    communicator = WebsocketCommunicator(_get_consumer_asgi(), '/ws/notifications/')
    connected, _ = await communicator.connect()
    assert connected

    await communicator.send_json_to({'type': 'auth', 'token': access_token})
    await communicator.receive_json_from()

    await database_sync_to_async(NotificationService.create_notification)(
        user=member_user,
        type='system',
        title='Dedup once',
        message='First emit',
        metadata={'kind': 'dedup'},
        event_key='ws_dedup_case',
    )

    first_event = await communicator.receive_json_from(timeout=2)
    assert first_event['type'] == 'notification'
    assert first_event['data']['title'] == 'Dedup once'

    await database_sync_to_async(NotificationService.create_notification)(
        user=member_user,
        type='system',
        title='Dedup twice',
        message='Second emit should be skipped',
        metadata={'kind': 'dedup'},
        event_key='ws_dedup_case',
    )

    assert await communicator.receive_nothing(timeout=0.3) is True

    await communicator.disconnect()


@database_sync_to_async
def _build_access_token(user):
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token)


@database_sync_to_async
def _create_user(username, email):
    user_model = get_user_model()
    return user_model.objects.create_user(username=username, email=email, password='StrongPass123!')


def _get_consumer_asgi():
    from realtime.consumers import NotificationConsumer

    return URLRouter([
        path('ws/notifications/', NotificationConsumer.as_asgi()),
    ])
