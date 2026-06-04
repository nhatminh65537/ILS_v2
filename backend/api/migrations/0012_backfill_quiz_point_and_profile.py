"""Backfill derived quiz points + recompute cumulative profile quiz points.

After switching to the derived/cumulative point model:
  - ``Quiz.quiz_point`` is now SUM(question.score) instead of a hand-typed value.
  - ``UserProfile.total_quiz_point`` / ``quiz_completed`` are derived absolutely
    from the questions each user has ever answered correctly (no double-count),
    and completion means 100% of a quiz's questions solved.

This migration recomputes both for all existing data so the new signals/services
operate on consistent state. It is written against historical model states (no
imports of live services) and is idempotent.
"""

from django.db import migrations
from django.db.models import Sum


def backfill(apps, schema_editor):
    Quiz = apps.get_model('api', 'Quiz')
    QuizQuestion = apps.get_model('api', 'QuizQuestion')
    UserQuizAnswer = apps.get_model('api', 'UserQuizAnswer')
    UserQuizProgress = apps.get_model('api', 'UserQuizProgress')
    UserProfile = apps.get_model('api', 'UserProfile')

    # 1) quiz_point = sum of question scores
    for quiz in Quiz.objects.all():
        total = (
            QuizQuestion.objects.filter(quiz_id=quiz.id)
            .aggregate(total=Sum('score'))
            .get('total')
            or 0
        )
        if quiz.quiz_point != total:
            quiz.quiz_point = total
            quiz.save(update_fields=['quiz_point'])

    # 2) Recompute every user's cumulative quiz point + completion count, and
    #    realign UserQuizProgress.completed_at with the 100%-correct definition.
    user_ids = (
        UserQuizAnswer.objects.values_list('attempt__user_id', flat=True).distinct()
    )

    for user_id in user_ids:
        # quiz -> set of question ids ever answered correctly by this user
        solved_rows = (
            UserQuizAnswer.objects.filter(
                attempt__user_id=user_id, score_obtained__gt=0
            )
            .values_list('attempt__quiz_id', 'question_id')
            .distinct()
        )
        solved_by_quiz = {}
        for quiz_id, question_id in solved_rows:
            solved_by_quiz.setdefault(quiz_id, set()).add(question_id)

        total_point = 0
        completed_count = 0
        for quiz_id, solved_ids in solved_by_quiz.items():
            earned = (
                QuizQuestion.objects.filter(quiz_id=quiz_id, id__in=solved_ids)
                .aggregate(total=Sum('score'))
                .get('total')
                or 0
            )
            total_point += earned

            question_count = QuizQuestion.objects.filter(quiz_id=quiz_id).count()
            is_completed = question_count > 0 and len(solved_ids) >= question_count
            if is_completed:
                completed_count += 1

            # Realign progress.completed_at with the new definition.
            progress = UserQuizProgress.objects.filter(
                user_id=user_id, quiz_id=quiz_id
            ).first()
            if progress is not None:
                if is_completed and progress.completed_at is None:
                    progress.completed_at = (
                        progress.last_attempted_at or progress.first_attempted_at
                    )
                    progress.save(update_fields=['completed_at'])
                elif not is_completed and progress.completed_at is not None:
                    progress.completed_at = None
                    progress.save(update_fields=['completed_at'])

        profile, _ = UserProfile.objects.get_or_create(user_id=user_id)
        profile.total_quiz_point = total_point
        profile.quiz_completed = completed_count
        profile.save(update_fields=['total_quiz_point', 'quiz_completed'])


def noop_reverse(apps, schema_editor):
    # Derived values cannot be meaningfully un-derived; leave data as-is.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0011_quizconfig_filter_feedback'),
    ]

    operations = [
        migrations.RunPython(backfill, noop_reverse),
    ]
