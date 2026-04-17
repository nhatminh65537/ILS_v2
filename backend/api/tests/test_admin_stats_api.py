from datetime import timedelta

import pytest
from django.utils import timezone

from api.models import (
    Challenge,
    Quiz,
    User,
    UserChallengeProgress,
    UserChallengeSubmit,
    UserProfile,
    UserQuizAttempt,
    UserQuizProgress,
)


@pytest.fixture
def admin_stats_fixture(db):
    admin_user = User.objects.create_superuser(
        username='stats_admin',
        password='AdminPass123!',
        email='stats_admin@example.com',
    )
    UserProfile.objects.create(user=admin_user, display_name='Stats Admin')

    active_user = User.objects.create_user(
        username='stats_active',
        password='StrongPass123!',
        email='stats_active@example.com',
    )
    UserProfile.objects.create(
        user=active_user,
        display_name='Active User',
        total_learning_point=40,
        total_challenge_point=30,
        total_quiz_point=20,
        course_completed=1,
        challenge_completed=1,
        quiz_completed=1,
        last_active_at=timezone.now() - timedelta(hours=2),
    )

    stale_user = User.objects.create_user(
        username='stats_stale',
        password='StrongPass123!',
        email='stats_stale@example.com',
    )
    UserProfile.objects.create(
        user=stale_user,
        display_name='Stale User',
        total_learning_point=10,
        total_challenge_point=5,
        total_quiz_point=5,
        last_active_at=timezone.now() - timedelta(days=3),
    )

    boundary_user = User.objects.create_user(
        username='stats_boundary',
        password='StrongPass123!',
        email='stats_boundary@example.com',
    )
    boundary_profile = UserProfile.objects.create(
        user=boundary_user,
        display_name='Boundary User',
        last_active_at=timezone.now() - timedelta(hours=23, minutes=59),
    )

    challenge = Challenge.objects.create(
        slug='stats-challenge',
        title='Stats Challenge',
        status=Challenge.Status.PUBLISHED,
        difficulty=Challenge.Difficulty.EASY,
        source=Challenge.Source.MANUAL,
        storage_path='/tmp/stats-challenge',
        challenge_point=50,
        instance_required=False,
    )
    UserChallengeProgress.objects.create(
        user=active_user,
        challenge=challenge,
        completed_at=timezone.now() - timedelta(days=1),
    )
    UserChallengeSubmit.objects.create(
        user=active_user,
        challenge=challenge,
        submitted_flag='flag{ok}',
        is_correct=True,
    )

    quiz = Quiz.objects.create(
        title='Stats Quiz',
        status=Quiz.Status.PUBLISHED,
        quiz_point=25,
        total_questions=5,
    )
    UserQuizProgress.objects.create(
        user=active_user,
        quiz=quiz,
        best_score=95,
        attempt_count=2,
        first_attempted_at=timezone.now() - timedelta(days=2),
        last_attempted_at=timezone.now() - timedelta(hours=3),
        completed_at=timezone.now() - timedelta(hours=3),
    )
    UserQuizAttempt.objects.create(
        user=active_user,
        quiz=quiz,
        total_score=95,
    )

    active_session = active_user.sessions.create(
        device_info='active browser',
        refresh_token_hash='active-token-hash',
        last_used_at=timezone.now() - timedelta(minutes=5),
        expires_at=timezone.now() + timedelta(days=3),
    )
    revoked_session = active_user.sessions.create(
        device_info='old browser',
        refresh_token_hash='revoked-token-hash',
        last_used_at=timezone.now() - timedelta(days=1),
        expires_at=timezone.now() + timedelta(days=1),
        revoked_at=timezone.now() - timedelta(hours=1),
    )

    return {
        'admin_user': admin_user,
        'active_user': active_user,
        'stale_user': stale_user,
        'boundary_user': boundary_user,
        'boundary_profile': boundary_profile,
        'active_session': active_session,
        'revoked_session': revoked_session,
    }


@pytest.mark.django_db
class TestAdminStatsAPI:
    def test_overview_returns_expected_counts(self, admin_client, admin_stats_fixture, rbac_seed):
        response = admin_client.get('/api/admin/stats/')

        assert response.status_code == 200
        assert response.data == {
            'user_count': 5,
            'active_today': 2,
            'solves_week': 2,
        }

    def test_overview_includes_exact_24_hour_boundary(self, admin_client, admin_stats_fixture, rbac_seed):
        response = admin_client.get('/api/admin/stats/')

        assert response.status_code == 200
        assert response.data['active_today'] == 2

    def test_user_detail_returns_nested_payload(self, admin_client, admin_stats_fixture, rbac_seed):
        response = admin_client.get(f"/api/admin/stats/users/{admin_stats_fixture['active_user'].id}/")

        assert response.status_code == 200
        assert response.data['user']['username'] == 'stats_active'
        assert response.data['points'] == {
            'learning': 40,
            'challenge': 30,
            'quiz': 20,
            'total': 90,
        }
        assert response.data['completion']['challenges_completed'] == 1
        assert response.data['completion']['quizzes_completed'] == 1
        assert response.data['completion']['challenge_correct_submits'] == 1
        assert response.data['sessions']['total'] == 2
        assert response.data['sessions']['active'] == 1
        assert response.data['sessions']['revoked'] == 1
        assert response.data['activity']['last_active_at'] is not None

    def test_user_detail_missing_user_returns_404(self, admin_client, admin_stats_fixture, rbac_seed):
        response = admin_client.get('/api/admin/stats/users/999999/')

        assert response.status_code == 404

    def test_non_admin_is_rejected(self, member_client, admin_stats_fixture, rbac_seed):
        response = member_client.get('/api/admin/stats/')

        assert response.status_code == 403