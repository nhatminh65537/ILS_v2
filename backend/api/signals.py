"""Django signals for denormalized progress updates."""

import logging
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django.db.models import Max

from .models import (
    CourseNode,
    Notification,
    Quiz,
    QuizQuestion,
    UserChallengeProgress,
    UserLessonProgress,
    UserProfile,
    UserQuizAttempt,
    UserQuizProgress,
)
from .services.learn_progress_service import LearnProgressService
from .services.notification_service import NotificationService
from .services.quiz_service import QuizService

logger = logging.getLogger(__name__)


def _sync_quiz_aggregates(quiz_id):
    """Keep a quiz's denormalized ``total_questions`` + ``quiz_point`` in sync.

    ``quiz_point`` is the maximum achievable score (sum of question scores), so it
    must be recomputed whenever a question is added, edited (score change), or
    deleted. ``total_questions`` mirrors the question count.
    """
    try:
        quiz = Quiz.objects.get(id=quiz_id)
    except Quiz.DoesNotExist:
        return
    QuizService.sync_total_questions(quiz)
    QuizService.sync_quiz_point(quiz)


@receiver(post_save, sender=QuizQuestion)
def handle_quiz_question_saved(sender, instance, **kwargs):
    """Resync parent quiz aggregates when a question is created/updated."""
    _sync_quiz_aggregates(instance.quiz_id)


@receiver(post_delete, sender=QuizQuestion)
def handle_quiz_question_deleted(sender, instance, **kwargs):
    """Resync parent quiz aggregates when a question is deleted."""
    _sync_quiz_aggregates(instance.quiz_id)


@receiver(post_save, sender=UserChallengeProgress)
def handle_challenge_progress_saved(sender, instance, created, **kwargs):
    """Create challenge completion notification when progress transitions to completed."""
    if instance.completed_at is None:
        return

    try:
        challenge = instance.challenge
        _, created_notification = NotificationService.create_notification(
            user=instance.user,
            type=Notification.NotificationType.CHALLENGE,
            title='Challenge Solved!',
            message=f'You solved: {challenge.title}',
            metadata={
                'resource_type': 'challenge',
                'resource_id': challenge.id,
                'resource_title': challenge.title,
                'points_awarded': int(challenge.challenge_point or 0),
            },
            event_key=f'auto_challenge_complete:{instance.user.id}:{challenge.id}',
            return_created=True,
        )
        if not created_notification:
            logger.debug('Skip duplicate challenge notification for user %s challenge %s', instance.user_id, challenge.id)
    except Exception as exc:
        logger.error(
            'Signal error creating challenge notification for progress %s: %s',
            instance.id,
            str(exc),
            exc_info=True,
        )
        raise


@receiver(post_save, sender=UserLessonProgress)
def handle_lesson_progress_saved(sender, instance, created, **kwargs):
    """Update course aggregate progress when a lesson is completed."""

    if instance.completed_at is None:
        return

    try:
        try:
            node = instance.lesson.node
        except CourseNode.DoesNotExist:
            logger.warning(
                'Learn progress signal skipped: lesson %s has no course node',
                instance.lesson_id,
            )
            return

        _, transitioned_to_completion = LearnProgressService.recompute_course_progress(
            user=instance.user,
            course=node.course,
            return_transition=True,
        )

        if transitioned_to_completion:
            _, created_notification = NotificationService.create_notification(
                user=instance.user,
                type=Notification.NotificationType.COURSE,
                title='Course Completed!',
                message=f'You completed: {node.course.title}',
                metadata={
                    'resource_type': 'course',
                    'resource_id': node.course.id,
                    'resource_title': node.course.title,
                    'points_awarded': int(node.course.learning_point or 0),
                },
                event_key=f'auto_course_complete:{instance.user.id}:{node.course.id}',
                return_created=True,
            )
            if not created_notification:
                logger.debug('Skip duplicate course notification for user %s course %s', instance.user_id, node.course_id)
    except Exception as exc:
        logger.error(
            'Signal error updating UserCourseProgress for lesson progress %s: %s',
            instance.id,
            str(exc),
            exc_info=True,
        )
        raise


@receiver(post_save, sender=UserQuizAttempt)
def handle_quiz_attempt_finished(sender, instance, created, **kwargs):
    """
    Signal handler: Update UserQuizProgress when a UserQuizAttempt finishes.
    
    Triggered on UserQuizAttempt.post_save. Only processes when finished_at is not None.
    
    Aggregates metrics:
    - best_score: maximum total_score across all finished attempts
    - attempt_count: total count of finished attempts
    - first_attempted_at: timestamp of earliest attempt
    - last_attempted_at: timestamp of most recent attempt
    - completed_at: set when best_score == quiz.quiz_point (perfect score)
    
    Edge cases:
    - Skips if finished_at is None (attempt still in progress)
    - Idempotent: re-saving same attempt does not corrupt metrics
    - Atomic upsert: creates UserQuizProgress if not exists
    - Handles data correction: completed_at clears if score drops below perfect
    
    Args:
        sender: UserQuizAttempt model class
        instance: The UserQuizAttempt instance being saved
        created: Boolean indicating if this is a new instance (not used; we check finished_at instead)
        **kwargs: Django signal standard kwargs
    """
    
    # Guard: only process finished attempts
    if not instance.finished_at:
        logger.debug(
            f"Signal skip: UserQuizAttempt {instance.id} not finished yet (finished_at=None)"
        )
        return
    
    # Guard: validate score
    if instance.total_score < 0:
        logger.warning(
            f"Signal warning: UserQuizAttempt {instance.id} has negative score {instance.total_score}"
        )
        return
    
    try:
        # Atomic upsert: get or create progress record
        progress, created_progress = UserQuizProgress.objects.get_or_create(
            user=instance.user,
            quiz=instance.quiz
        )
        previous_completed_at = progress.completed_at
        
        # Compute best_score: max across all finished attempts
        best_score_result = UserQuizAttempt.objects.filter(
            user=instance.user,
            quiz=instance.quiz,
            finished_at__isnull=False
        ).aggregate(max_score=Max('total_score'))
        best_score = best_score_result['max_score'] or 0
        
        # Compute attempt_count: count of finished attempts
        attempt_count = UserQuizAttempt.objects.filter(
            user=instance.user,
            quiz=instance.quiz,
            finished_at__isnull=False
        ).count()
        
        # Compute first_attempted_at: earliest started_at
        first_attempt = UserQuizAttempt.objects.filter(
            user=instance.user,
            quiz=instance.quiz,
            finished_at__isnull=False
        ).order_by('started_at').first()
        first_attempted_at = first_attempt.started_at if first_attempt else None
        
        # Compute last_attempted_at: current attempt's started_at (most recent)
        last_attempted_at = instance.started_at

        # Completion = the user has historically answered 100% of the quiz's
        # questions correctly (max score), not "best single-attempt score". This
        # matches the cumulative point model where each question counts once.
        is_completed = QuizService.is_quiz_completed(instance.quiz, instance.user)
        if is_completed and not progress.completed_at:
            completed_at = instance.finished_at  # mark first 100% moment
        elif not is_completed and progress.completed_at:
            completed_at = None  # questions added since → no longer 100%
        else:
            completed_at = progress.completed_at  # keep existing status

        # Update progress record with computed values
        progress.best_score = best_score
        progress.attempt_count = attempt_count
        progress.first_attempted_at = first_attempted_at
        progress.last_attempted_at = last_attempted_at
        progress.completed_at = completed_at
        progress.save()

        # Recompute cumulative profile points absolutely (idempotent, no
        # double-count): total = sum of current scores of every question the user
        # has ever answered correctly, across all quizzes.
        QuizService.recompute_user_quiz_points(instance.user)

        # Notify only on the first completion transition for this quiz.
        if previous_completed_at is None and completed_at is not None:
            quiz_point = QuizService.earned_quiz_point(instance.quiz, instance.user)
            _, created_notification = NotificationService.create_notification(
                user=instance.user,
                type=Notification.NotificationType.QUIZ,
                title='Quiz Completed!',
                message=f'You completed: {instance.quiz.title}',
                metadata={
                    'resource_type': 'quiz',
                    'resource_id': instance.quiz.id,
                    'resource_title': instance.quiz.title,
                    'points_awarded': int(quiz_point),
                },
                event_key=f'auto_quiz_complete:{instance.user.id}:{instance.quiz.id}',
                return_created=True,
            )
            if not created_notification:
                logger.debug('Skip duplicate quiz notification for user %s quiz %s', instance.user_id, instance.quiz_id)
        
        action = "created" if created_progress else "updated"
        logger.info(
            f"Signal: UserQuizProgress {action} for user {instance.user.username} "
            f"quiz {instance.quiz.id}: best_score={best_score}, "
            f"attempt_count={attempt_count}, completed={progress.is_completed}"
        )
        
    except Exception as e:
        logger.error(
            f"Signal error updating UserQuizProgress for attempt {instance.id}: {str(e)}",
            exc_info=True
        )
        # Re-raise to ensure signal failure is visible
        raise
