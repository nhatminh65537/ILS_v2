"""
WebSocket routing for realtime consumers.

Maps WebSocket endpoints to consumer class handlers.
"""

from django.urls import path, re_path
from channels.routing import URLRouter

from .consumers import QuizConsumer, NotificationConsumer


websocket_urlpatterns = [
    path('ws/quiz/<int:quiz_id>/', QuizConsumer.as_asgi(), name='ws_quiz'),
    path('ws/notifications/', NotificationConsumer.as_asgi(), name='ws_notifications'),
]


__all__ = ['websocket_urlpatterns']
