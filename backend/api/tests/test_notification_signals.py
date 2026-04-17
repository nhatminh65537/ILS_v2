import pytest
from django.utils import timezone

from api.models import (
    Challenge,
    ChallengeCategory,
    Course,
    CourseCategory,
    CourseNode,
    Lesson,
    Notification,
    Quiz,
    UserChallengeProgress,
    UserLessonProgress,
    UserQuizAttempt,
)
from api.services.challenge_service import ChallengeService
from api.services.learn_progress_service import LearnProgressService
from api.services.notification_service import NotificationService


def _create_course_with_lessons(*, slug: str, title: str, learning_point: int = 10):
    category = CourseCategory.objects.create(name=f'{title} Category')
    course = Course.objects.create(
        slug=slug,
        title=title,
        status=Course.Status.PUBLISHED,
        category=category,
        learning_point=learning_point,
    )

    lesson_1 = Lesson.objects.create(
        title=f'{title} Lesson 1',
        lesson_type=Lesson.LessonType.MARKDOWN,
        content_md='content 1',
    )
    CourseNode.objects.create(
        course=course,
        lesson=lesson_1,
        is_item=True,
        title=lesson_1.title,
        position=0,
    )

    lesson_2 = Lesson.objects.create(
        title=f'{title} Lesson 2',
        lesson_type=Lesson.LessonType.MARKDOWN,
        content_md='content 2',
    )
    CourseNode.objects.create(
        course=course,
        lesson=lesson_2,
        is_item=True,
        title=lesson_2.title,
        position=1,
    )

    return course, lesson_1, lesson_2


def _create_challenge(*, slug: str, title: str, points: int = 50):
    category = ChallengeCategory.objects.create(name=f'{title} Category')
    return Challenge.objects.create(
        slug=slug,
        title=title,
        status=Challenge.Status.PUBLISHED,
        category=category,
        source=Challenge.Source.MANUAL,
        storage_path=f'storage/{slug}',
        challenge_point=points,
    )


@pytest.mark.django_db
class TestNotificationAutoSignalFlow:
    def test_create_notification_deduplicates_by_event_key(self, member_user):
        first = NotificationService.create_notification(
            user=member_user,
            type=Notification.NotificationType.SYSTEM,
            title='Title 1',
            message='Message 1',
            metadata={'source': 'test'},
            event_key='auto_test:1',
        )

        second = NotificationService.create_notification(
            user=member_user,
            type=Notification.NotificationType.SYSTEM,
            title='Title 2',
            message='Message 2',
            metadata={'source': 'updated'},
            event_key='auto_test:1',
        )

        assert first.id == second.id
        assert Notification.objects.filter(user=member_user, event_key='auto_test:1').count() == 1

    def test_course_completion_signal_creates_single_notification(self, member_user):
        course, lesson_1, lesson_2 = _create_course_with_lessons(slug='signal-course', title='Signal Course')

        first_complete = LearnProgressService.complete_lesson(user=member_user, lesson=lesson_1)
        assert first_complete[1] is True

        second_complete = LearnProgressService.complete_lesson(user=member_user, lesson=lesson_2)
        assert second_complete[1] is True

        notifications = Notification.objects.filter(
            user=member_user,
            type=Notification.NotificationType.COURSE,
            event_key=f'auto_course_complete:{member_user.id}:{course.id}',
        )
        assert notifications.count() == 1

        progress = UserLessonProgress.objects.get(user=member_user, lesson=lesson_2)
        progress.save(update_fields=['completed_at'])

        assert notifications.count() == 1

    def test_challenge_completion_signal_creates_single_notification(self, member_user):
        challenge = _create_challenge(slug='signal-challenge', title='Signal Challenge')

        ChallengeService.handle_correct_submission(user=member_user, challenge=challenge)
        ChallengeService.handle_correct_submission(user=member_user, challenge=challenge)

        notifications = Notification.objects.filter(
            user=member_user,
            type=Notification.NotificationType.CHALLENGE,
            event_key=f'auto_challenge_complete:{member_user.id}:{challenge.id}',
        )
        assert notifications.count() == 1

    def test_user_challenge_progress_post_save_signal_creates_notification(self, member_user):
        challenge = _create_challenge(slug='signal-challenge-direct', title='Signal Challenge Direct')

        progress = UserChallengeProgress.objects.create(
            user=member_user,
            challenge=challenge,
            completed_at=timezone.now(),
        )

        notifications = Notification.objects.filter(
            user=member_user,
            type=Notification.NotificationType.CHALLENGE,
            event_key=f'auto_challenge_complete:{member_user.id}:{challenge.id}',
        )
        assert notifications.count() == 1

        progress.save(update_fields=['completed_at'])
        assert notifications.count() == 1

    def test_quiz_completion_signal_creates_single_notification(self, member_user):
        quiz = Quiz.objects.create(title='Signal Quiz', quiz_point=100, status=Quiz.Status.PUBLISHED)

        attempt = UserQuizAttempt.objects.create(
            quiz=quiz,
            user=member_user,
            total_score=100,
            finished_at=timezone.now(),
        )

        notifications = Notification.objects.filter(
            user=member_user,
            type=Notification.NotificationType.QUIZ,
            event_key=f'auto_quiz_complete:{member_user.id}:{quiz.id}',
        )
        assert notifications.count() == 1

        attempt.total_score = 100
        attempt.save()

        assert notifications.count() == 1