"""
Tests for Quiz Progress Tracking Signal Handler (cumulative point model).

Signal handler: UserQuizAttempt.post_save -> updates UserQuizProgress.

Point model (revised):
  - quiz.quiz_point = SUM(question.score)  (kept in sync by QuizQuestion signal)
  - completion = the user has EVER answered 100% of the quiz's questions correctly
    (tracked via UserQuizAnswer.score_obtained > 0 across all attempts)
  - UserProfile.total_quiz_point = sum of current scores of every question the
    user has ever answered correctly, across all quizzes (no double-count, no
    subtraction on later wrong answers).
"""

import pytest
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model

from api.models import (
    Quiz,
    QuizQuestion,
    UserProfile,
    UserQuizAnswer,
    UserQuizAttempt,
    UserQuizProgress,
)

User = get_user_model()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_quiz(title, scores):
    """Create a published quiz with single_choice questions of the given scores.

    quiz_point is auto-derived to SUM(scores) by the QuizQuestion signal.
    """
    quiz = Quiz.objects.create(title=title, status='published')
    questions = []
    for index, score in enumerate(scores):
        questions.append(
            QuizQuestion.objects.create(
                quiz=quiz,
                question_type=QuizQuestion.QuestionType.SINGLE_CHOICE,
                content={'text': f'Q{index}'},
                score=score,
                position=index,
            )
        )
    quiz.refresh_from_db()
    return quiz, questions


def _answer(attempt, question, correct):
    """Record one UserQuizAnswer; correct => score_obtained = question.score."""
    return UserQuizAnswer.objects.create(
        attempt=attempt,
        question=question,
        answer_data={},
        score_obtained=question.score if correct else 0,
    )


def _finish_attempt(quiz, user, answers, finished_at=None):
    """Create an attempt, record answers, then finish it (fires the signal).

    ``answers`` is a list of (question, correct_bool). total_score is the sum of
    awarded points; the post_save with finished_at set triggers the progress
    signal.
    """
    attempt = UserQuizAttempt.objects.create(quiz=quiz, user=user)
    total = 0
    for question, correct in answers:
        record = _answer(attempt, question, correct)
        total += record.score_obtained
    attempt.total_score = total
    attempt.finished_at = finished_at or timezone.now()
    attempt.save()
    return attempt


@pytest.fixture
def quiz3(db):
    """Quiz with 3 questions, scores 2/3/5 -> quiz_point 10."""
    return _make_quiz('Python Basics', [2, 3, 5])


@pytest.mark.django_db
class TestQuizPointDerivation:
    """quiz_point is derived from the sum of question scores via signal."""

    def test_quiz_point_equals_sum_of_scores(self, quiz3):
        quiz, _ = quiz3
        assert quiz.quiz_point == 10

    def test_quiz_point_resyncs_on_question_change(self, quiz3):
        quiz, questions = quiz3
        questions[0].score = 12
        questions[0].save()
        quiz.refresh_from_db()
        assert quiz.quiz_point == 20  # 12 + 3 + 5

    def test_quiz_point_resyncs_on_question_delete(self, quiz3):
        quiz, questions = quiz3
        questions[2].delete()  # remove the score-5 question
        quiz.refresh_from_db()
        assert quiz.quiz_point == 5  # 2 + 3
        assert quiz.total_questions == 2


@pytest.mark.django_db
class TestUserQuizProgressSignal:
    """Test suite for the UserQuizProgress signal handler."""

    def test_signal_skip_if_finished_at_none(self, member_user, quiz3):
        quiz, questions = quiz3
        attempt = UserQuizAttempt.objects.create(quiz=quiz, user=member_user)
        _answer(attempt, questions[0], correct=True)
        # No finished_at -> signal should not create progress.
        assert not UserQuizProgress.objects.filter(user=member_user, quiz=quiz).exists()

    def test_signal_fires_on_finished_attempt(self, member_user, quiz3):
        quiz, questions = quiz3
        _finish_attempt(quiz, member_user, [(questions[0], True), (questions[1], True)])

        progress = UserQuizProgress.objects.get(user=member_user, quiz=quiz)
        assert progress.best_score == 5  # 2 + 3
        assert progress.attempt_count == 1

    def test_best_score_reflects_max(self, member_user, quiz3):
        quiz, q = quiz3
        _finish_attempt(quiz, member_user, [(q[0], True)])               # 2
        _finish_attempt(quiz, member_user, [(q[1], True), (q[2], True)])  # 8
        _finish_attempt(quiz, member_user, [(q[2], True)])               # 5

        progress = UserQuizProgress.objects.get(user=member_user, quiz=quiz)
        assert progress.best_score == 8

    def test_attempt_count_increments(self, member_user, quiz3):
        quiz, q = quiz3
        for _ in range(3):
            _finish_attempt(quiz, member_user, [(q[0], True)])

        progress = UserQuizProgress.objects.get(user=member_user, quiz=quiz)
        assert progress.attempt_count == 3

    def test_completed_when_all_questions_correct(self, member_user, quiz3):
        quiz, q = quiz3
        _finish_attempt(quiz, member_user, [(q[0], True), (q[1], True), (q[2], True)])

        progress = UserQuizProgress.objects.get(user=member_user, quiz=quiz)
        assert progress.completed_at is not None
        assert progress.is_completed

    def test_not_completed_when_partial(self, member_user, quiz3):
        quiz, q = quiz3
        _finish_attempt(quiz, member_user, [(q[0], True), (q[1], True)])  # missing q[2]

        progress = UserQuizProgress.objects.get(user=member_user, quiz=quiz)
        assert progress.completed_at is None
        assert not progress.is_completed

    def test_completion_accumulates_across_attempts(self, member_user, quiz3):
        """Correct questions from different attempts together reach 100%."""
        quiz, q = quiz3
        _finish_attempt(quiz, member_user, [(q[0], True), (q[1], True)])  # 2 of 3
        progress = UserQuizProgress.objects.get(user=member_user, quiz=quiz)
        assert not progress.is_completed

        _finish_attempt(quiz, member_user, [(q[2], True)])  # the missing one
        progress.refresh_from_db()
        assert progress.is_completed


@pytest.mark.django_db
class TestCumulativeProfilePoints:
    """UserProfile.total_quiz_point / quiz_completed cumulative + idempotent."""

    def test_points_accumulate_per_correct_question(self, member_user, quiz3):
        quiz, q = quiz3
        _finish_attempt(quiz, member_user, [(q[0], True), (q[1], True)])  # 2 + 3

        profile = UserProfile.objects.get(user=member_user)
        assert profile.total_quiz_point == 5
        assert profile.quiz_completed == 0  # not yet 100%

    def test_no_double_count_on_resolving_same_question(self, member_user, quiz3):
        quiz, q = quiz3
        _finish_attempt(quiz, member_user, [(q[0], True)])  # +2
        _finish_attempt(quiz, member_user, [(q[0], True)])  # same question again

        profile = UserProfile.objects.get(user=member_user)
        assert profile.total_quiz_point == 2  # counted once

    def test_wrong_answer_never_subtracts(self, member_user, quiz3):
        quiz, q = quiz3
        _finish_attempt(quiz, member_user, [(q[0], True)])   # +2
        _finish_attempt(quiz, member_user, [(q[0], False)])  # now wrong

        profile = UserProfile.objects.get(user=member_user)
        assert profile.total_quiz_point == 2  # unchanged

    def test_quiz_completed_increments_on_100_percent(self, member_user, quiz3):
        quiz, q = quiz3
        _finish_attempt(quiz, member_user, [(q[0], True), (q[1], True), (q[2], True)])

        profile = UserProfile.objects.get(user=member_user)
        assert profile.total_quiz_point == 10
        assert profile.quiz_completed == 1

    def test_points_span_multiple_quizzes(self, member_user):
        quiz_a, qa = _make_quiz('A', [4, 6])   # max 10
        quiz_b, qb = _make_quiz('B', [5])      # max 5

        _finish_attempt(quiz_a, member_user, [(qa[0], True)])              # +4
        _finish_attempt(quiz_b, member_user, [(qb[0], True)])              # +5, completes B

        profile = UserProfile.objects.get(user=member_user)
        assert profile.total_quiz_point == 9
        assert profile.quiz_completed == 1  # only B is 100%


@pytest.mark.django_db
class TestTimestampsAndIsolation:
    def test_timestamps_tracked(self, member_user, quiz3):
        quiz, q = quiz3
        t0 = timezone.now()
        _finish_attempt(quiz, member_user, [(q[0], True)], finished_at=t0 + timedelta(minutes=5))
        last = _finish_attempt(quiz, member_user, [(q[1], True)], finished_at=t0 + timedelta(hours=1))

        progress = UserQuizProgress.objects.get(user=member_user, quiz=quiz)
        assert progress.first_attempted_at is not None
        assert progress.last_attempted_at is not None
        assert progress.first_attempted_at <= progress.last_attempted_at
        assert progress.last_attempted_at == last.started_at

    def test_multiple_users_separate_progress(self, quiz3, db):
        quiz, q = quiz3
        user1 = User.objects.create_user(username='u1', password='p', email='u1@test.com')
        user2 = User.objects.create_user(username='u2', password='p', email='u2@test.com')

        _finish_attempt(quiz, user1, [(q[2], True)])   # 5
        _finish_attempt(quiz, user2, [(q[0], True)])   # 2

        assert UserQuizProgress.objects.get(user=user1, quiz=quiz).best_score == 5
        assert UserQuizProgress.objects.get(user=user2, quiz=quiz).best_score == 2

    def test_zero_score_attempt_creates_progress(self, member_user, quiz3):
        quiz, q = quiz3
        _finish_attempt(quiz, member_user, [(q[0], False)])

        progress = UserQuizProgress.objects.get(user=member_user, quiz=quiz)
        assert progress.best_score == 0
        assert progress.attempt_count == 1
        assert not progress.is_completed
        assert UserProfile.objects.get(user=member_user).total_quiz_point == 0
