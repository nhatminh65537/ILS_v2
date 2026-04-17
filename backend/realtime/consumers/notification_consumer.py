"""
Django Channels WebSocket consumer for real-time notification delivery.

Protocol:
  1. Client connects to /ws/notifications/
  2. Client sends first-message auth: {"type": "auth", "token": "<access_jwt>"}
  3. Server responds with {"type": "auth_ok"} when authenticated
  4. Server pushes notification events: {"type": "notification", "data": {...}}

Decision: Q-INFRA-05 Option B (first-message auth pattern)
"""

import asyncio
import logging
from typing import Any

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.conf import settings
from rest_framework_simplejwt.backends import TokenBackend
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError, TokenBackendError

from api.models import User

logger = logging.getLogger(__name__)


class CloseCode:
    """WebSocket close codes for notification consumer."""

    AUTH_TIMEOUT = 4008
    AUTH_FAILED = 4001


class AuthTimeout:
    """Auth timeout in seconds."""

    TIMEOUT_SEC = 5


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """Push real-time notifications to authenticated users."""

    async def connect(self):
        self.user = None
        self.group_name = None
        self.auth_timeout_task = None

        await self.accept()
        self.auth_timeout_task = asyncio.create_task(self._auth_timeout_guard())

    async def disconnect(self, close_code):
        if self.auth_timeout_task:
            self.auth_timeout_task.cancel()

        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def _auth_timeout_guard(self):
        try:
            await asyncio.sleep(AuthTimeout.TIMEOUT_SEC)
            if self.user is None:
                logger.warning('Auth timeout for notifications websocket')
                await self.close(code=CloseCode.AUTH_TIMEOUT)
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            logger.error('Auth timeout guard error for notifications websocket: %s', exc)

    async def receive_json(self, content, **kwargs):
        if content.get('type') != 'auth':
            await self.send_json({'type': 'error', 'code': 'not_authenticated', 'message': 'Must authenticate first'})
            return

        if self.user is not None:
            await self.send_json({'type': 'error', 'code': 'already_authenticated', 'message': 'Already authenticated'})
            return

        token = content.get('token')
        if not token:
            await self.close(code=CloseCode.AUTH_FAILED)
            return

        user = await self._authenticate_token(token)
        if user is None:
            await self.close(code=CloseCode.AUTH_FAILED)
            return

        self.user = user
        self.group_name = f'notifications_{user.id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)

        if self.auth_timeout_task:
            self.auth_timeout_task.cancel()

        await self.send_json(
            {
                'type': 'auth_ok',
                'user_id': user.id,
                'username': user.username,
            }
        )

    async def notification_send(self, event: dict[str, Any]):
        """Forward channel layer notification event to the client."""
        await self.send_json({'type': 'notification', 'data': event['data']})

    @database_sync_to_async
    def _authenticate_token(self, token):
        try:
            backend = TokenBackend(
                algorithm='HS256',
                signing_key=settings.SECRET_KEY,
                verifying_key=settings.SECRET_KEY,
            )
            payload = backend.decode(token, verify=True)
            user_id = payload.get('user_id')
            if not user_id:
                return None
            user = User.objects.filter(id=user_id, is_active=True).first()
            return user
        except (InvalidToken, TokenError, TokenBackendError):
            return None
