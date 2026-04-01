"""
Django Channels WebSocket consumer for real-time quiz practice sessions.

Protocol:
  1. Client connects (no JWT in URL)
  2. Client sends first-message auth: {"type": "auth", "token": "<access_jwt>"}
  3. Server responds with {"type": "auth_ok"} if valid, otherwise closes with error
  4. Client sends actions: {"action": "start"}, {"action": "answer", ...}, {"action": "next"}
  5. Server sends question, answer_result, or finish events

Decision: Q-INFRA-05 Option B (first-message auth pattern)
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.layers import get_channel_layer
from channels.db import database_sync_to_async
from django.utils import timezone
from django.db.models import Q
from django.core.cache import cache
from rest_framework_simplejwt.backends import TokenBackend
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from api.models import Quiz, QuizQuestion, UserQuizAttempt, UserQuizAnswer, UserQuizProgress, QuizConfig, User

logger = logging.getLogger(__name__)


# Protocol Constants
class CloseCode:
    """WebSocket close codes for quiz consumer."""
    AUTH_TIMEOUT = 4008
    AUTH_FAILED = 4001
    INVALID_ACTION = 4002
    MAX_ATTEMPT_EXCEEDED = 4003
    QUIZ_NOT_FOUND = 4004
    INTERNAL_ERROR = 4011


class AuthTimeout:
    """Auth timeout in seconds."""
    TIMEOUT_SEC = 5


class QuizConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for quiz practice sessions.
    
    Lifecycle:
      1. connect() - accept socket, set auth timer
      2. receive_json() - dispatch to _handle_auth or _handle_action
      3. disconnect() - mark attempt finished if in progress
    """

    async def connect(self):
        """
        Accept WebSocket connection and set up auth timeout.
        
        Client MUST send auth message within AuthTimeout.TIMEOUT_SEC seconds.
        """
        self.user = None
        self.quiz_id = None
        self.attempt_id = None
        self.auth_timeout_task = None
        
        # Extract quiz_id from URL route kwargs
        self.quiz_id = self.scope.get('url_route', {}).get('kwargs', {}).get('quiz_id')
        
        if not self.quiz_id:
            await self.close(code=CloseCode.QUIZ_NOT_FOUND)
            return
        
        await self.accept()
        
        # Set auth timeout guard
        self.auth_timeout_task = asyncio.create_task(self._auth_timeout_guard())

    async def _auth_timeout_guard(self):
        """Close socket if auth message not received within timeout."""
        try:
            await asyncio.sleep(AuthTimeout.TIMEOUT_SEC)
            if self.user is None:
                logger.warning(f"Auth timeout for WS quiz {self.quiz_id}")
                await self.close(code=CloseCode.AUTH_TIMEOUT)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Auth timeout guard error: {e}")

    async def receive_json(self, content, **kwargs):
        """
        Route incoming JSON messages to handlers.
        
        Expected formats:
          - {"type": "auth", "token": "<jwt>"}
          - {"action": "start"}
          - {"action": "answer", "question_id": <id>, "answer_data": {...}}
          - {"action": "next"}
        """
        try:
            msg_type = content.get('type')
            action = content.get('action')
            
            if msg_type == 'auth':
                await self._handle_auth(content)
            elif action:
                if self.user is None:
                    await self._send_error('not_authenticated', 'Must authenticate first')
                    return
                await self._handle_action(action, content)
            else:
                await self._send_error('invalid_message', 'Expected type or action field')
        except json.JSONDecodeError:
            await self._send_error('invalid_json', 'Message must be valid JSON')
        except Exception as e:
            logger.error(f"Error in receive_json: {e}")
            await self._send_error('internal_error', 'Server error processing message')

    async def _handle_auth(self, content: Dict[str, Any]):
        """
        Authenticate user via JWT token (TASK-006 + TASK-007).
        
        Validates token signature, expiry, and user active status.
        On success, cancels auth timeout and sends auth_ok.
        On failure, closes socket with auth_failed code.
        """
        token = content.get('token')
        if not token:
            await self.close(code=CloseCode.AUTH_FAILED)
            return
        
        try:
            # Decode JWT using TokenBackend
            backend = TokenBackend(algorithm='HS256')
            payload = backend.decode(token, verify=True)
            
            # Extract user_id from payload
            user_id = payload.get('user_id')
            if not user_id:
                await self.close(code=CloseCode.AUTH_FAILED)
                return
            
            # Fetch and validate user
            user = await self._get_user_by_id(user_id)
            if not user or not user.is_active:
                await self.close(code=CloseCode.AUTH_FAILED)
                return
            
            # Store user in consumer instance
            self.user = user
            
            # Cancel auth timeout guard (TASK-007)
            if self.auth_timeout_task:
                self.auth_timeout_task.cancel()
            
            # Send auth success event
            await self.send_json({
                'type': 'auth_ok',
                'user_id': user.id,
                'username': user.username,
            })
            
            logger.info(f"User {user.username} authenticated on quiz WS {self.quiz_id}")
            
        except (InvalidToken, TokenError) as e:
            logger.warning(f"Invalid token: {e}")
            await self.close(code=CloseCode.AUTH_FAILED)
        except Exception as e:
            logger.error(f"Auth error: {e}")
            await self.close(code=CloseCode.AUTH_FAILED)

    async def _handle_action(self, action: str, content: Dict[str, Any]):
        """
        Route action to appropriate handler: start, answer, next.
        
        Stub: action handlers implemented in Phase 2-3.
        """
        if action == 'start':
            await self._handle_start(content)
        elif action == 'answer':
            await self._handle_answer(content)
        elif action == 'next':
            await self._handle_next(content)
        else:
            await self._send_error('invalid_action', f'Unknown action: {action}')

    async def _handle_start(self, content: Dict[str, Any]):
        """
        Start a new quiz attempt (TASK-008 + TASK-009).
        
        Creates UserQuizAttempt with config snapshot and selects first question.
        Enforces max_attempt check.
        """
        if self.attempt_id is not None:
            await self._send_error('already_started', 'Attempt already started')
            return
        
        try:
            # TASK-008: Create attempt with config snapshot
            attempt = await self._create_quiz_attempt()
            if not attempt:
                await self._send_error('max_attempt_exceeded', 'Maximum attempts reached')
                return
            
            self.attempt_id = attempt.id
            
            # TASK-008: Get first question
            questions = await self._get_attempt_questions(attempt)
            if not questions:
                await self._send_error('no_questions', 'Quiz has no questions')
                return
            
            # Send first question
            question = questions[0]
            await self._send_question(question, attempt, current=1, total=len(questions))
            
            logger.info(f"Attempt {attempt.id} started for user {self.user.username} quiz {self.quiz_id}")
            
        except Exception as e:
            logger.error(f"Start error: {e}")
            await self._send_error('internal_error', 'Failed to start attempt')

    async def _handle_answer(self, content: Dict[str, Any]):
        """
        Handle student answer submission (TASK-011 + TASK-012).
        
        Validates payload, checks for duplicates, scores answer using domain logic,
        and persists UserQuizAnswer record.
        """
        if not self.attempt_id:
            await self._send_error('not_started', 'Attempt not started')
            return
        
        question_id = content.get('question_id')
        answer_data = content.get('answer_data')
        
        if not question_id or answer_data is None:
            await self._send_error('invalid_payload', 'Missing question_id or answer_data')
            return
        
        try:
            # Fetch question
            question = await self._get_question(question_id)
            if not question:
                await self._send_error('question_not_found', 'Question not found')
                return
            
            # TASK-011: Prevent duplicate answers
            attempt = await self._get_attempt(self.attempt_id)
            existing = await self._get_user_quiz_answer(attempt, question)
            if existing:
                await self._send_error('already_answered', 'Question already answered')
                return
            
            # TASK-012: Reuse domain scoring logic
            is_correct = await self._validate_answer(question, answer_data)
            score_obtained = await self._score_answer(question, answer_data, is_correct)
            
            # Persist answer
            answer_record = await self._create_quiz_answer(
                attempt, question, answer_data, is_correct, score_obtained
            )
            
            # Send result with explanation
            correct_answer = await self._get_correct_answer_display(question)
            await self.send_json({
                'type': 'answer_result',
                'is_correct': is_correct,
                'score_obtained': score_obtained,
                'explanation': question.explanation or '',
                'correct_answer': correct_answer,
            })
            
            logger.info(f"Answer recorded for attempt {attempt.id}, question {question.id}: {is_correct}")
            
        except Exception as e:
            logger.error(f"Answer error: {e}")
            await self._send_error('internal_error', 'Failed to process answer')

    async def _handle_next(self, content: Dict[str, Any]):
        """
        Get next question or finish if all answered (TASK-010).
        
        Skips deleted/unavailable questions without creating answer records.
        """
        if not self.attempt_id:
            await self._send_error('not_started', 'Attempt not started')
            return
        
        try:
            attempt = await self._get_attempt(self.attempt_id)
            if not attempt:
                await self._send_error('attempt_not_found', 'Attempt not found')
                return
            
            # Get all questions for this attempt
            questions = await self._get_attempt_questions(attempt)
            if not questions:
                await self._send_error('no_questions', 'Quiz has no questions')
                return
            
            # Get answered question IDs
            answered_ids = await self._get_answered_question_ids(attempt)
            
            # Find next unanswered question
            next_question = None
            for q in questions:
                if q.id not in answered_ids:
                    next_question = q
                    break
            
            if next_question:
                # Send next question
                current = len(answered_ids) + 1
                total = len(questions)
                await self._send_question(next_question, attempt, current=current, total=total)
            else:
                # All questions answered, finish attempt
                await self._handle_finish(attempt)
                
        except Exception as e:
            logger.error(f"Next error: {e}")
            await self._send_error('internal_error', 'Failed to get next question')

    async def _send_error(self, code: str, message: str):
        """Send error event to client."""
        await self.send_json({
            'type': 'error',
            'code': code,
            'message': message,
        })

    async def _send_question(self, question: QuizQuestion, attempt: UserQuizAttempt, current: int, total: int):
        """
        Send question to client without revealing correctness metadata (TASK-008).
        
        Omits is_correct, hidden answer fields.  Options are serialized with position only.
        """
        # Serialize question based on type
        question_payload = {
            'id': question.id,
            'type': question.question_type,
            'content': question.content,
            'time_limit_sec': attempt.config.get('time_limit_sec', 0),
        }
        
        # Add options for choice-based questions
        if question.question_type in ['single_choice', 'multi_choice']:
            options = []
            for opt in question.options.all():
                options.append({
                    'id': opt.id,
                    'content': opt.content,
                    'position': opt.position,
                })
            if attempt.config.get('random_option', False):
                # Options already randomized; client can shuffle if needed
                pass
            question_payload['options'] = options
        
        await self.send_json({
            'type': 'question',
            'attempt_id': attempt.id,
            'question': question_payload,
            'progress': {
                'current': current,
                'total': total,
            },
        })

    async def _handle_finish(self, attempt: UserQuizAttempt):
        """
        Finish attempt and send result (Phase 3 TASK-014).
        Calculate total score, duration, and update attempt record.
        """
        try:
            # Mark attempt finished
            finished_attempt = await self._finish_attempt(attempt)
            
            # Calculate max score
            questions = await self._get_attempt_questions(finished_attempt)
            max_score = sum(q.score for q in questions)
            
            # Duration in seconds
            duration_sec = int((finished_attempt.finished_at - finished_attempt.started_at).total_seconds())
            
            # Send finish event
            await self.send_json({
                'type': 'finish',
                'attempt_id': finished_attempt.id,
                'total_score': finished_attempt.total_score,
                'max_score': max_score,
                'duration_sec': duration_sec,
            })
            
            logger.info(f"Attempt {finished_attempt.id} finished: {finished_attempt.total_score}/{max_score}")
            
        except Exception as e:
            logger.error(f"Finish error: {e}")
            await self._send_error('internal_error', 'Failed to finish attempt')

    # Database sync methods (using sync_to_async)
    @database_sync_to_async
    def _get_user_by_id(self, user_id: int) -> Optional[User]:
        """Fetch user by ID (async wrapper)."""
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

    @database_sync_to_async
    def _get_quiz(self, quiz_id: int) -> Optional[Quiz]:
        """Fetch quiz by ID."""
        try:
            return Quiz.objects.get(id=quiz_id)
        except Quiz.DoesNotExist:
            return None

    @database_sync_to_async
    def _get_or_create_quiz_config(self, quiz: Quiz, user: User) -> QuizConfig:
        """Get or create quiz config for user, with defaults."""
        config, created = QuizConfig.objects.get_or_create(
            quiz=quiz,
            user=user,
            defaults={
                'total_questions': 0,  # 0 means all available
                'time_limit_sec': 0,  # 0 means no limit
                'random_question': False,
                'random_option': False,
                'allow_review': True,
                'allow_retry': True,
                'max_attempt': None,  # None means unlimited
            }
        )
        return config

    @database_sync_to_async
    def _check_max_attempt(self, quiz: Quiz, user: User) -> bool:
        """Check if user has exceeded max_attempt limit."""
        config = QuizConfig.objects.filter(quiz=quiz, user=user).first()
        if not config or not config.max_attempt:
            return True  # No limit or no config
        
        completed_count = UserQuizAttempt.objects.filter(
            quiz=quiz,
            user=user,
            finished_at__isnull=False,
        ).count()
        
        return completed_count < config.max_attempt

    @database_sync_to_async
    def _create_quiz_attempt(self) -> Optional[UserQuizAttempt]:
        """Create new quiz attempt with config snapshot (TASK-008)."""
        quiz = Quiz.objects.get(id=self.quiz_id)
        config = self._get_or_create_quiz_config(quiz, self.user)
        
        # Check max_attempt
        if not self._check_max_attempt(quiz, self.user):
            return None
        
        # Build config snapshot
        config_snapshot = {
            'total_questions': config.total_questions or 0,
            'time_limit_sec': config.time_limit_sec or 0,
            'random_question': config.random_question,
            'random_option': config.random_option,
            'allow_review': config.allow_review,
            'allow_retry': config.allow_retry,
            'max_attempt': config.max_attempt,
        }
        
        attempt = UserQuizAttempt.objects.create(
            quiz=quiz,
            user=self.user,
            config=config_snapshot,
            started_at=timezone.now(),
        )
        
        return attempt

    @database_sync_to_async
    def _get_attempt(self, attempt_id: int) -> Optional[UserQuizAttempt]:
        """Fetch attempt by ID."""
        try:
            return UserQuizAttempt.objects.get(id=attempt_id)
        except UserQuizAttempt.DoesNotExist:
            return None

    @database_sync_to_async
    def _get_attempt_questions(self, attempt: UserQuizAttempt):
        """Get questions for this attempt (TASK-008 + TASK-010)."""
        quiz = attempt.quiz
        
        # Get all published questions for this quiz
        questions = list(QuizQuestion.objects.filter(
            quiz=quiz,
            status='published',
        ))
        
        # Apply total_questions limit if configured
        total_limit = attempt.config.get('total_questions', 0)
        if total_limit > 0 and len(questions) > total_limit:
            questions = questions[:total_limit]
        
        return questions

    @database_sync_to_async
    def _get_answered_question_ids(self, attempt: UserQuizAttempt):
        """Get set of answered question IDs for this attempt."""
        answered = UserQuizAnswer.objects.filter(
            attempt=attempt
        ).values_list('question_id', flat=True)
        return set(answered)

    @database_sync_to_async
    def _get_question(self, question_id: int) -> Optional[QuizQuestion]:
        """Fetch question by ID."""
        try:
            return QuizQuestion.objects.get(id=question_id)
        except QuizQuestion.DoesNotExist:
            return None

    @database_sync_to_async
    def _get_user_quiz_answer(self, attempt: UserQuizAttempt, question: QuizQuestion) -> Optional[UserQuizAnswer]:
        """Check if user already answered this question in this attempt."""
        try:
            return UserQuizAnswer.objects.get(attempt=attempt, question=question)
        except UserQuizAnswer.DoesNotExist:
            return None

    @database_sync_to_async
    def _validate_answer(self, question: QuizQuestion, answer_data: Dict[str, Any]) -> bool:
        """
        Validate answer using domain model logic (TASK-012).
        Reuse QuizQuestion.validate_answer().
        """
        return question.validate_answer(answer_data)

    @database_sync_to_async
    def _score_answer(self, question: QuizQuestion, answer_data: Dict[str, Any], is_correct: bool) -> int:
        """
        Score answer using domain model logic (TASK-012).
        Reuse QuizQuestion.score_answer().
        """
        if is_correct:
            return question.score_answer(answer_data)
        return 0

    @database_sync_to_async
    def _create_quiz_answer(
        self, 
        attempt: UserQuizAttempt, 
        question: QuizQuestion, 
        answer_data: Dict[str, Any],
        is_correct: bool,
        score_obtained: int
    ) -> UserQuizAnswer:
        """Create and persist UserQuizAnswer record (TASK-011 + TASK-012)."""
        answer = UserQuizAnswer.objects.create(
            attempt=attempt,
            question=question,
            answer_data=answer_data,
            is_correct=is_correct,
            score_obtained=score_obtained,
            answered_at=timezone.now(),
        )
        return answer

    @database_sync_to_async
    def _get_correct_answer_display(self, question: QuizQuestion) -> Dict[str, Any]:
        """
        Build correct answer display payload for result event (TASK-013).
        Shape depends on question type.
        """
        if question.question_type == 'single_choice':
            correct_opt = question.options.filter(is_correct=True).first()
            return {'option_id': correct_opt.id if correct_opt else None}
        elif question.question_type == 'multi_choice':
            correct_opts = list(
                question.options.filter(is_correct=True).values_list('id', flat=True)
            )
            return {'option_ids': correct_opts}
        elif question.question_type == 'fill_blank':
            # Return first correct answer variant
            answer_obj = question.answers.first()
            return {'text': answer_obj.answer if answer_obj else ''}
        return {}

    @database_sync_to_async
    def _finish_attempt(self, attempt: UserQuizAttempt):
        """Mark attempt as finished and calculate total score (TASK-014)."""
        # Calculate total score
        answers = UserQuizAnswer.objects.filter(attempt=attempt)
        total_score = sum(a.score_obtained for a in answers)
        
        # Update attempt
        attempt.finished_at = timezone.now()
        attempt.total_score = total_score
        attempt.save(update_fields=['finished_at', 'total_score'])
        
        return attempt

    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnect.
        
        Cancel auth timeout task if still pending.
        Stub: mark attempt finished (Phase 2 TASK-009 / Phase 3).
        """
        if self.auth_timeout_task:
            self.auth_timeout_task.cancel()
        
        logger.info(f"Disconnected: quiz_id={self.quiz_id}, user={self.user}, code={close_code}")
