from django.shortcuts import get_object_or_404

from api.models import Quiz, QuizConfig, QuizQuestion, UserQuizProgress


class QuizService:
    """Domain operations for quiz view flows."""

    @staticmethod
    def is_editor_or_admin(user):
        if user.is_superuser:
            return True
        return user.user_roles.filter(role__name__in=['Admin', 'Editor']).exists()

    @classmethod
    def filter_visible_quizzes(cls, queryset, user, status_param):
        if not cls.is_editor_or_admin(user):
            return queryset.filter(status=Quiz.Status.PUBLISHED)
        if status_param:
            return queryset.filter(status=status_param)
        return queryset

    @staticmethod
    def get_quiz_question(quiz, qid):
        return get_object_or_404(QuizQuestion, id=qid, quiz=quiz)

    @staticmethod
    def sync_total_questions(quiz):
        total = quiz.questions.count()
        if quiz.total_questions != total:
            quiz.total_questions = total
            quiz.save(update_fields=['total_questions', 'updated_at'])

    @staticmethod
    def get_or_create_user_config(quiz, user):
        return QuizConfig.objects.get_or_create(
            quiz=quiz,
            user=user,
            defaults={
                'total_questions': None,
                'time_limit_sec': None,
                'random_question': False,
                'random_option': False,
                'allow_review': True,
                'allow_retry': True,
                'max_attempt': None,
                'is_active': True,
            },
        )

    @staticmethod
    def build_default_progress_payload(quiz_id, user_id):
        return {
            'id': None,
            'user_id': user_id,
            'quiz_id': quiz_id,
            'best_score': 0,
            'attempt_count': 0,
            'first_attempted_at': None,
            'last_attempted_at': None,
        }

    @staticmethod
    def get_user_progress(quiz, user):
        try:
            return UserQuizProgress.objects.get(quiz=quiz, user=user)
        except UserQuizProgress.DoesNotExist:
            return None
