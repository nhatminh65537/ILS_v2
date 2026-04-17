"""Admin statistics aggregation service."""

from datetime import timedelta

from django.db.models import Count, Max, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

from api.models import (
    User,
    UserChallengeProgress,
    UserChallengeSubmit,
    UserCourseProgress,
    UserLessonProgress,
    UserProfile,
    UserQuizAttempt,
    UserQuizProgress,
    UserSession,
)


class AdminStatsService:
    """Service for admin statistics overview and user detail aggregation."""

    @staticmethod
    def _window_start(days):
        return timezone.now() - timedelta(days=days)

    @classmethod
    def build_overview(cls):
        active_window = cls._window_start(1)
        solve_window = cls._window_start(7)

        user_count = User.objects.filter(is_active=True).count()
        active_today = (
            UserProfile.objects.filter(
                user__is_active=True,
                last_active_at__gte=active_window,
            )
            .values('user_id')
            .distinct()
            .count()
        )
        solves_week = (
            UserChallengeProgress.objects.filter(completed_at__gte=solve_window).count()
            + UserQuizProgress.objects.filter(completed_at__gte=solve_window).count()
        )

        return {
            'user_count': user_count,
            'active_today': active_today,
            'solves_week': solves_week,
        }

    @staticmethod
    def _build_profile_payload(user, profile):
        return {
            'id': user.id,
            'username': user.username,
            'email': user.email or '',
            'is_active': user.is_active,
            'date_joined': user.date_joined,
            'last_login': user.last_login,
            'display_name': getattr(profile, 'display_name', None),
            'avatar_url': getattr(profile, 'avatar_url', None),
            'last_active_at': getattr(profile, 'last_active_at', None),
        }

    @staticmethod
    def _build_points_payload(profile):
        learning = int(getattr(profile, 'total_learning_point', 0) or 0)
        challenge = int(getattr(profile, 'total_challenge_point', 0) or 0)
        quiz = int(getattr(profile, 'total_quiz_point', 0) or 0)
        return {
            'learning': learning,
            'challenge': challenge,
            'quiz': quiz,
            'total': learning + challenge + quiz,
        }

    @classmethod
    def _build_completion_payload(cls, user, profile):
        course_progress = UserCourseProgress.objects.filter(user=user).aggregate(
            started=Count('id', filter=Q(started_at__isnull=False)),
            completed=Count('id', filter=Q(completed_at__isnull=False)),
        )
        lesson_progress = UserLessonProgress.objects.filter(user=user).aggregate(
            started=Count('id', filter=Q(started_at__isnull=False)),
            completed=Count('id', filter=Q(completed_at__isnull=False)),
        )
        challenge_progress = UserChallengeProgress.objects.filter(user=user).aggregate(
            completed=Count('id', filter=Q(completed_at__isnull=False)),
        )
        challenge_submits = UserChallengeSubmit.objects.filter(user=user).aggregate(
            total=Count('id'),
            correct=Count('id', filter=Q(is_correct=True)),
        )
        quiz_progress = UserQuizProgress.objects.filter(user=user).aggregate(
            completed=Count('id', filter=Q(completed_at__isnull=False)),
            best_score=Max('best_score'),
        )
        quiz_attempts = UserQuizAttempt.objects.filter(user=user).aggregate(total=Count('id'))

        return {
            'courses_started': int(course_progress['started'] or 0),
            'courses_completed': int(profile.course_completed if profile is not None else course_progress['completed'] or 0),
            'lessons_started': int(lesson_progress['started'] or 0),
            'lessons_completed': int(lesson_progress['completed'] or 0),
            'challenges_completed': int(profile.challenge_completed if profile is not None else challenge_progress['completed'] or 0),
            'challenge_submits': int(challenge_submits['total'] or 0),
            'challenge_correct_submits': int(challenge_submits['correct'] or 0),
            'quizzes_completed': int(profile.quiz_completed if profile is not None else quiz_progress['completed'] or 0),
            'quiz_attempts': int(quiz_attempts['total'] or 0),
            'quiz_best_score': int(quiz_progress['best_score'] or 0),
        }

    @staticmethod
    def _build_activity_payload(user, profile):
        course_progress = UserCourseProgress.objects.filter(user=user).aggregate(
            latest_started=Max('started_at'),
            latest_completed=Max('completed_at'),
        )
        lesson_progress = UserLessonProgress.objects.filter(user=user).aggregate(
            latest_started=Max('started_at'),
            latest_completed=Max('completed_at'),
        )
        challenge_progress = UserChallengeProgress.objects.filter(user=user).aggregate(
            latest_completed=Max('completed_at'),
        )
        quiz_progress = UserQuizProgress.objects.filter(user=user).aggregate(
            latest_attempted=Max('last_attempted_at'),
            latest_completed=Max('completed_at'),
        )

        return {
            'last_active_at': getattr(profile, 'last_active_at', None),
            'last_course_started_at': course_progress['latest_started'],
            'last_course_completed_at': course_progress['latest_completed'],
            'last_lesson_started_at': lesson_progress['latest_started'],
            'last_lesson_completed_at': lesson_progress['latest_completed'],
            'last_challenge_completed_at': challenge_progress['latest_completed'],
            'last_quiz_attempted_at': quiz_progress['latest_attempted'],
            'last_quiz_completed_at': quiz_progress['latest_completed'],
        }

    @staticmethod
    def _build_session_payload(user):
        now = timezone.now()
        sessions = UserSession.objects.filter(user=user).aggregate(
            total=Count('id'),
            active=Count('id', filter=Q(revoked_at__isnull=True) & (Q(expires_at__isnull=True) | Q(expires_at__gt=now))),
            revoked=Count('id', filter=Q(revoked_at__isnull=False)),
            latest_last_used=Max('last_used_at'),
            latest_expires=Max('expires_at'),
        )
        return {
            'total': int(sessions['total'] or 0),
            'active': int(sessions['active'] or 0),
            'revoked': int(sessions['revoked'] or 0),
            'latest_last_used_at': sessions['latest_last_used'],
            'latest_expires_at': sessions['latest_expires'],
        }

    @classmethod
    def build_user_detail(cls, user_id):
        user = get_object_or_404(User, id=user_id)
        profile = UserProfile.objects.filter(user=user).first()

        return {
            'user': cls._build_profile_payload(user, profile),
            'points': cls._build_points_payload(profile),
            'completion': cls._build_completion_payload(user, profile),
            'activity': cls._build_activity_payload(user, profile),
            'sessions': cls._build_session_payload(user),
        }