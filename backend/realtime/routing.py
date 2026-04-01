"""
WebSocket routing for realtime consumers.

Maps WebSocket endpoints to consumer class handlers.
"""

from django.urls import path, re_path
from channels.routing import URLRouter

from .consumers import QuizConsumer


websocket_urlpatterns = [
    path('ws/quiz/<int:quiz_id>/', QuizConsumer.as_asgi(), name='ws_quiz'),
]


__all__ = ['websocket_urlpatterns']
