from datetime import timedelta

import pytest
from django.utils import timezone

from api.models import (
    Challenge,
    Lesson,
    Quiz,
    User,
    UserChallengeProgress,
    UserLessonProgress,
    UserProfile,
    UserQuizProgress,
)


@pytest.mark.django_db
class TestProfileTask81:
    def test_get_me_profile_auto_creates_profile(self, member_client, member_user):
        assert not UserProfile.objects.filter(user=member_user).exists()

        response = member_client.get('/api/users/me/profile/')

        assert response.status_code == 200
        assert response.data['username'] == member_user.username
        assert UserProfile.objects.filter(user=member_user).exists()

    def test_patch_me_profile_updates_allowed_fields_only(self, member_client, member_user):
        member_client.get('/api/users/me/profile/')

        response = member_client.patch(
            '/api/users/me/profile/',
            {
                'display_name': 'Member One',
                'bio': 'Cyber learner',
                'total_learning_point': 999,
            },
            format='json',
        )

        assert response.status_code == 200

        profile = UserProfile.objects.get(user=member_user)
        assert profile.display_name == 'Member One'
        assert profile.bio == 'Cyber learner'
        assert profile.total_learning_point == 0

    def test_patch_me_settings_updates_language_theme_timezone(self, member_client, member_user):
        member_client.get('/api/users/me/profile/')

        response = member_client.patch(
            '/api/users/me/settings/',
            {'language': 'en', 'theme': 'dark', 'timezone': 'Asia/Ho_Chi_Minh'},
            format='json',
        )

        assert response.status_code == 200
        profile = UserProfile.objects.get(user=member_user)
        assert profile.language == 'en'
        assert profile.theme == 'dark'
        assert profile.timezone == 'Asia/Ho_Chi_Minh'

    def test_patch_me_settings_rejects_invalid_language_and_theme(self, member_client, member_user):
        member_client.get('/api/users/me/profile/')

        response = member_client.patch(
            '/api/users/me/settings/',
            {'language': 'fr', 'theme': 'blue'},
            format='json',
        )

        assert response.status_code == 400
        assert 'language' in response.data
        assert 'theme' in response.data

    def test_patch_me_account_updates_username_and_email(self, member_client, member_user):
        response = member_client.patch(
            '/api/users/me/account/',
            {'username': 'member_new', 'email': 'member_new@example.com'},
            format='json',
        )

        assert response.status_code == 200
        member_user.refresh_from_db()
        assert member_user.username == 'member_new'
        assert member_user.email == 'member_new@example.com'

    def test_patch_me_account_rejects_duplicate_username_and_email(self, member_client, member_user):
        User.objects.create_user(username='other_user', email='other@example.com', password='StrongPass123!')

        duplicate_username_response = member_client.patch(
            '/api/users/me/account/',
            {'username': 'other_user'},
            format='json',
        )
        assert duplicate_username_response.status_code == 400
        assert 'username' in duplicate_username_response.data

        duplicate_email_response = member_client.patch(
            '/api/users/me/account/',
            {'email': 'other@example.com'},
            format='json',
        )
        assert duplicate_email_response.status_code == 400
        assert 'email' in duplicate_email_response.data

    def test_get_me_activity_returns_latest_events_sorted_desc(self, member_client, member_user):
        now = timezone.now()
        lesson = Lesson.objects.create(
            title='Lesson 1',
            lesson_type=Lesson.LessonType.MARKDOWN,
            content_md='content',
        )
        challenge = Challenge.objects.create(
            slug='challenge-1',
            title='Challenge 1',
            storage_path='storage/challenge-1',
        )
        quiz = Quiz.objects.create(title='Quiz 1')

        UserLessonProgress.objects.create(user=member_user, lesson=lesson, completed_at=now - timedelta(minutes=10))
        UserChallengeProgress.objects.create(user=member_user, challenge=challenge, completed_at=now - timedelta(minutes=5))
        UserQuizProgress.objects.create(user=member_user, quiz=quiz, completed_at=now - timedelta(minutes=1))

        response = member_client.get('/api/users/me/activity/')

        assert response.status_code == 200
        assert len(response.data) == 3
        assert response.data[0]['type'] == 'quiz_complete'
        assert response.data[1]['type'] == 'challenge_solve'
        assert response.data[2]['type'] == 'lesson_complete'

    def test_get_public_profile_and_public_activity(self, api_client, member_user):
        member_profile = UserProfile.objects.create(
            user=member_user,
            display_name='Public Name',
            bio='Public Bio',
            total_quiz_point=15,
        )
        quiz = Quiz.objects.create(title='Public Quiz')
        UserQuizProgress.objects.create(user=member_user, quiz=quiz, completed_at=timezone.now())

        profile_response = api_client.get(f'/api/users/{member_user.username}/profile/')
        assert profile_response.status_code == 200
        assert profile_response.data['display_name'] == 'Public Name'
        assert 'email' not in profile_response.data

        activity_response = api_client.get(f'/api/users/{member_user.username}/activity/')
        assert activity_response.status_code == 200
        assert len(activity_response.data) == 1
        assert activity_response.data[0]['type'] == 'quiz_complete'

        assert member_profile.total_quiz_point == 15

    def test_public_endpoints_return_404_for_unknown_username(self, api_client):
        profile_response = api_client.get('/api/users/unknown_user/profile/')
        activity_response = api_client.get('/api/users/unknown_user/activity/')

        assert profile_response.status_code == 404
        assert activity_response.status_code == 404

    def test_me_endpoints_require_authentication(self, api_client):
        assert api_client.get('/api/users/me/profile/').status_code == 401
        assert api_client.patch('/api/users/me/profile/', {}, format='json').status_code == 401
        assert api_client.patch('/api/users/me/settings/', {}, format='json').status_code == 401
        assert api_client.patch('/api/users/me/account/', {}, format='json').status_code == 401
        assert api_client.get('/api/users/me/activity/').status_code == 401
