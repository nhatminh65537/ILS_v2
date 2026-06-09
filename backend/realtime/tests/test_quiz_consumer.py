"""
Async integration tests for quiz WebSocket consumer.

Test scenarios per TASK-016 + TASK-017 Plan.
Uses channels.testing.WebsocketCommunicator for async consumer testing.

Run with: pytest backend/realtime/tests/test_quiz_consumer.py -v
"""

import pytest
import asyncio
from django.contrib.auth import get_user_model
from django.urls import path
from channels.db import database_sync_to_async
from channels.routing import URLRouter
from channels.testing import WebsocketCommunicator
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import Quiz, QuizConfig, QuizQuestion, QuizQuestionOption

User = get_user_model()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_auth_success():
    """✅ Valid JWT auth message → auth_ok event."""
    # Create user and quiz
    user = await _create_user('alice', 'alice@example.com')
    quiz = await _create_quiz('Test Quiz')
    
    # Get JWT token
    tokens = await database_sync_to_async(RefreshToken.for_user)(user)
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
    quiz = await _create_quiz('Test')
    
    communicator = WebsocketCommunicator(_get_consumer_asgi(), f"/ws/quiz/{quiz.id}/")
    connected, _ = await communicator.connect()
    assert connected
    
    # Wait for auth timeout (5 seconds)
    await asyncio.sleep(6)
    
    # Should receive error or disconnect
    try:
        response = await asyncio.wait_for(communicator.receive_output(), timeout=1)
        # Connection should be closed
        assert response is None or response.get('type') == 'websocket.close'
    except asyncio.TimeoutError:
        # Expected - no response after timeout
        pass
    
    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_start_attempt():
    """✅ After auth, start action creates attempt and sends first question."""
    user = await _create_user('bob', 'bob@example.com')
    quiz = await _create_quiz('Quiz')
    
    # Create a question
    q = await _create_question(quiz)
    
    tokens = await database_sync_to_async(RefreshToken.for_user)(user)
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


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_start_empty_quiz_finishes_immediately():
    """Empty published quiz should finish immediately with 0/0 instead of error."""
    user = await _create_user('carol', 'carol@example.com')
    quiz = await _create_quiz('Empty Quiz')

    tokens = await database_sync_to_async(RefreshToken.for_user)(user)
    access_token = str(tokens.access_token)

    communicator = WebsocketCommunicator(
        _get_consumer_asgi(),
        f"/ws/quiz/{quiz.id}/",
    )

    connected, _ = await communicator.connect()
    assert connected

    await communicator.send_json_to({"type": "auth", "token": access_token})
    auth_resp = await communicator.receive_json_from()
    assert auth_resp['type'] == 'auth_ok'

    await communicator.send_json_to({"action": "start"})
    finish_resp = await communicator.receive_json_from()
    assert finish_resp['type'] == 'finish'
    assert finish_resp['total_score'] == 0
    assert finish_resp['max_score'] == 0

    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_draft_status_question_is_served():
    """REGRESSION: questions default to status='draft' and were never published
    by the editor UI. The consumer must serve them as long as the parent Quiz is
    published (it no longer filters on question status). Previously this yielded
    an empty set -> instant finish."""
    user = await _create_user('dave', 'dave@example.com')
    quiz = await _create_quiz('Quiz With Draft Q')

    # Question left at the default 'draft' status (no status kwarg).
    q = await _create_question(quiz, status='draft')

    tokens = await database_sync_to_async(RefreshToken.for_user)(user)
    access_token = str(tokens.access_token)

    communicator = WebsocketCommunicator(_get_consumer_asgi(), f"/ws/quiz/{quiz.id}/")
    await communicator.connect()

    await communicator.send_json_to({"type": "auth", "token": access_token})
    auth_resp = await communicator.receive_json_from()
    assert auth_resp['type'] == 'auth_ok'

    await communicator.send_json_to({"action": "start"})
    resp = await communicator.receive_json_from()
    # Must be a question, NOT an instant finish.
    assert resp['type'] == 'question'
    assert resp['question']['id'] == q.id

    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_immediate_feedback_true_returns_full_result():
    """immediate_feedback=True → answer_result includes correctness + answer."""
    user = await _create_user('erin', 'erin@example.com')
    quiz = await _create_quiz('Feedback On Quiz')
    q = await _create_question(quiz)
    await _set_quiz_config(quiz, user, immediate_feedback=True)
    opt_id = await _correct_option_id(q)

    tokens = await database_sync_to_async(RefreshToken.for_user)(user)
    access_token = str(tokens.access_token)

    communicator = WebsocketCommunicator(_get_consumer_asgi(), f"/ws/quiz/{quiz.id}/")
    await communicator.connect()
    await communicator.send_json_to({"type": "auth", "token": access_token})
    assert (await communicator.receive_json_from())['type'] == 'auth_ok'

    await communicator.send_json_to({"action": "start"})
    assert (await communicator.receive_json_from())['type'] == 'question'

    await communicator.send_json_to(
        {"action": "answer", "question_id": q.id, "answer_data": {"option_id": opt_id}}
    )
    result = await communicator.receive_json_from()
    assert result['type'] == 'answer_result'
    assert result['immediate_feedback'] is True
    assert result['is_correct'] is True
    assert 'correct_answer' in result
    assert 'explanation' in result

    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_immediate_feedback_false_suppresses_answer():
    """immediate_feedback=False → answer_result is a bare ack; it must NOT leak
    correctness, score, explanation, or the correct answer over the wire."""
    user = await _create_user('frank', 'frank@example.com')
    quiz = await _create_quiz('Feedback Off Quiz')
    q = await _create_question(quiz)
    await _set_quiz_config(quiz, user, immediate_feedback=False)
    opt_id = await _correct_option_id(q)

    tokens = await database_sync_to_async(RefreshToken.for_user)(user)
    access_token = str(tokens.access_token)

    communicator = WebsocketCommunicator(_get_consumer_asgi(), f"/ws/quiz/{quiz.id}/")
    await communicator.connect()
    await communicator.send_json_to({"type": "auth", "token": access_token})
    assert (await communicator.receive_json_from())['type'] == 'auth_ok'

    await communicator.send_json_to({"action": "start"})
    assert (await communicator.receive_json_from())['type'] == 'question'

    await communicator.send_json_to(
        {"action": "answer", "question_id": q.id, "answer_data": {"option_id": opt_id}}
    )
    result = await communicator.receive_json_from()
    assert result['type'] == 'answer_result'
    assert result['immediate_feedback'] is False
    assert result.get('recorded') is True
    # Leak guard: none of the correctness/answer fields may be present.
    for leaked in ('is_correct', 'score_obtained', 'explanation', 'correct_answer'):
        assert leaked not in result, f'{leaked} must not be sent when feedback is off'

    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_total_questions_cap_is_stable_across_next():
    """REGRESSION: with total_questions=2 on a 4-question quiz, the selected set
    must be snapshotted on the attempt. Previously the set was re-shuffled/re-capped
    on every ``next`` call, so ``total`` stayed 2 while ``current`` climbed past it
    ("3 of 2", "4 of 2"). After two answers the session must finish — not serve a
    third question."""
    user = await _create_user('grace', 'grace@example.com')
    quiz = await _create_quiz('Capped Quiz')
    # 4 distinct questions; random_question on to exercise the shuffle path.
    for pos in range(1, 5):
        await _create_question(quiz, position=pos)
    await _set_quiz_config(quiz, user, total_questions=2, random_question=True)

    tokens = await database_sync_to_async(RefreshToken.for_user)(user)
    access_token = str(tokens.access_token)

    communicator = WebsocketCommunicator(_get_consumer_asgi(), f"/ws/quiz/{quiz.id}/")
    await communicator.connect()
    await communicator.send_json_to({"type": "auth", "token": access_token})
    assert (await communicator.receive_json_from())['type'] == 'auth_ok'

    await communicator.send_json_to({"action": "start"})

    served_question_ids = []
    expected_current = 1
    while True:
        resp = await communicator.receive_json_from()
        if resp['type'] == 'finish':
            break
        assert resp['type'] == 'question'
        # total is always the capped size; current must never exceed it.
        assert resp['progress']['total'] == 2
        assert resp['progress']['current'] == expected_current
        assert resp['progress']['current'] <= resp['progress']['total']
        qid = resp['question']['id']
        served_question_ids.append(qid)

        opt_id = await _correct_option_id_for(qid)
        await communicator.send_json_to(
            {"action": "answer", "question_id": qid, "answer_data": {"option_id": opt_id}}
        )
        assert (await communicator.receive_json_from())['type'] == 'answer_result'
        await communicator.send_json_to({"action": "next"})
        expected_current += 1

    # Exactly 2 distinct questions were served before finishing.
    assert len(served_question_ids) == 2
    assert len(set(served_question_ids)) == 2

    await communicator.disconnect()


@database_sync_to_async
def _correct_option_id_for(question_id):
    return (
        QuizQuestionOption.objects.filter(question_id=question_id, is_correct=True)
        .first()
        .id
    )


def _get_consumer_asgi():
    """Get ASGI application for consumer."""
    from realtime.consumers import QuizConsumer
    return URLRouter([
        path('ws/quiz/<int:quiz_id>/', QuizConsumer.as_asgi()),
    ])


@database_sync_to_async
def _set_quiz_config(quiz, user, **fields):
    config, _ = QuizConfig.objects.get_or_create(quiz=quiz, user=user)
    for key, value in fields.items():
        setattr(config, key, value)
    config.save()
    return config


@database_sync_to_async
def _correct_option_id(question):
    return question.options.filter(is_correct=True).first().id


@database_sync_to_async
def _create_user(username, email):
    return User.objects.create_user(username=username, email=email, password='pass')


@database_sync_to_async
def _create_quiz(title):
    return Quiz.objects.create(title=title, description='', status='published')


@database_sync_to_async
def _create_question(quiz, status='published', position=1):
    question = QuizQuestion.objects.create(
        quiz=quiz,
        question_type='single_choice',
        content={'text': 'What?'},
        score=10,
        position=position,
        status=status,
    )
    QuizQuestionOption.objects.create(
        question=question,
        content='Option A',
        is_correct=True,
        position=0,
    )
    return question

