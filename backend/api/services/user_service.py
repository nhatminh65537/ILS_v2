from django.db import transaction

from api.models import UserChallengeProgress, UserLessonProgress, UserProfile, UserQuizProgress


class UserService:
    """Domain operations for user profile and activity flows."""

    @staticmethod
    def get_or_create_profile(user):
        profile, _ = UserProfile.objects.get_or_create(user=user)
        return profile

    @staticmethod
    def update_account(user, serializer):
        with transaction.atomic():
            serializer.save()
        return user

    @staticmethod
    def build_user_activity(user, limit=30):
        events = []

        lesson_events = UserLessonProgress.objects.filter(
            user=user,
            completed_at__isnull=False,
        ).select_related('lesson').order_by('-completed_at')[:limit]
        for progress in lesson_events:
            events.append(
                {
                    'type': 'lesson_complete',
                    'timestamp': progress.completed_at,
                    'item_title': progress.lesson.title,
                    'source_id': progress.lesson_id,
                }
            )

        challenge_events = UserChallengeProgress.objects.filter(
            user=user,
            completed_at__isnull=False,
        ).select_related('challenge').order_by('-completed_at')[:limit]
        for progress in challenge_events:
            events.append(
                {
                    'type': 'challenge_solve',
                    'timestamp': progress.completed_at,
                    'item_title': progress.challenge.title,
                    'source_id': progress.challenge_id,
                }
            )

        quiz_events = UserQuizProgress.objects.filter(
            user=user,
            completed_at__isnull=False,
        ).select_related('quiz').order_by('-completed_at')[:limit]
        for progress in quiz_events:
            events.append(
                {
                    'type': 'quiz_complete',
                    'timestamp': progress.completed_at,
                    'item_title': progress.quiz.title,
                    'source_id': progress.quiz_id,
                }
            )

        events.sort(key=lambda item: item['timestamp'], reverse=True)
        return events[:limit]