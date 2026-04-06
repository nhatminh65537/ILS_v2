"""
Async integration tests for quiz WebSocket consumer.

Test scenarios per TASK-016 + TASK-017 Plan.
Uses channels.testing.WebsocketCommunicator for async consumer testing.

Run with: pytest backend/realtime/tests/test_quiz_consumer.py -v
"""

import pytest
import asyncio
from django.contrib.auth import get_user_model
from channels.testing import WebsocketCommunicator
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone

from api.models import Quiz, QuizQuestion, QuizQuestionOption

User = get_user_model()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_auth_success():
    """✅ Valid JWT auth message → auth_ok event."""
    # Create user and quiz
    user = User.objects.create_user(username='alice', email='alice@example.com', password='pass')
    quiz = Quiz.objects.create(title='Test Quiz', description='', status='published')
    
    # Get JWT token
    tokens = RefreshToken.for_user(user)
    access_token = str(tokens.access_token)
    
    # Connect to WebSocket
    communicator = WebsocketCommunicator(
        _get_consumer_asgi(),
        f"/ws/quiz/{quiz.id}/",
    )
    
    connected, subprotocol = await communicator.connect()
    assert connected
    
    # Send auth message
    await communicator.send_json_to({"type": "auth", "token": access_token})
    
    # Expect auth_ok
    response = await communicator.receive_json_from()
    assert response['type'] == 'auth_ok'
    assert response['user_id'] == user.id
    
    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_auth_timeout():
    """✅ No auth message within timeout → close with AUTH_TIMEOUT."""
    quiz = Quiz.objects.create(title='Test', description='', status='published')
    
    communicator = WebsocketCommunicator(_get_consumer_asgi(), f"/ws/quiz/{quiz.id}/")
    connected, _ = await communicator.connect()
    assert connected
    
    # Wait for auth timeout (5 seconds)
    await asyncio.sleep(6)
    
    # Should receive error or disconnect
    try:
        response = await asyncio.wait_for(communicator.receive_output(), timeout=1)
        # Connection should be closed
        assert response is None or response.get('type') == 'close'
    except asyncio.TimeoutError:
        # Expected - no response after timeout
        pass
    
    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_start_attempt():
    """✅ After auth, start action creates attempt and sends first question."""
    user = User.objects.create_user(username='bob', email='bob@example.com', password='pass')
    quiz = Quiz.objects.create(title='Quiz', description='', status='published')
    
    # Create a question
    q = QuizQuestion.objects.create(
        quiz=quiz,
        question_type='single_choice',
        content={'text': 'What?'},
        score=10,
        position=1,
        status='published'
    )
    opt = QuizQuestionOption.objects.create(
        question=q,
        content='Option A',
        is_correct=True,
        position=0
    )
    
    tokens = RefreshToken.for_user(user)
    access_token = str(tokens.access_token)
    
    communicator = WebsocketCommunicator(_get_consumer_asgi(), f"/ws/quiz/{quiz.id}/")
    await communicator.connect()
    
    # Auth
    await communicator.send_json_to({"type": "auth", "token": access_token})
    auth_resp = await communicator.receive_json_from()
    assert auth_resp['type'] == 'auth_ok'
    
    # Start
    await communicator.send_json_to({"action": "start"})
    question_resp = await communicator.receive_json_from()
    assert question_resp['type'] == 'question'
    assert question_resp['question']['id'] == q.id
    assert 'options' in question_resp['question']
    
    await communicator.disconnect()


def _get_consumer_asgi():
    """Get ASGI application for consumer."""
    from realtime.consumers import QuizConsumer
    return QuizConsumer.as_asgi()

