"""
Django signals for Quiz domain.

Handles automatic updates to UserQuizProgress when quiz attempts finish.
"""

import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db.models import Max

from .models import UserQuizAttempt, UserQuizProgress

logger = logging.getLogger(__name__)


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
        
        # Compute completed_at: set only when perfect score achieved
        # If best_score == quiz.quiz_point and not yet marked complete, set it
        # If best_score < quiz.quiz_point but previously marked complete, clear it
        if best_score >= instance.quiz.quiz_point and not progress.completed_at:
            completed_at = instance.finished_at  # Use finish time as completion marker
        elif best_score < instance.quiz.quiz_point and progress.completed_at:
            completed_at = None  # Clear completion if score drops below perfect
        else:
            completed_at = progress.completed_at  # Keep existing completion status
        
        # Update progress record with computed values
        progress.best_score = best_score
        progress.attempt_count = attempt_count
        progress.first_attempted_at = first_attempted_at
        progress.last_attempted_at = last_attempted_at
        progress.completed_at = completed_at
        progress.save()
        
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
