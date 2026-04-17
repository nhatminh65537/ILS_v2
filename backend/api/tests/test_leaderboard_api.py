import pytest

from api.models import UserProfile


def create_profile(user, *, learning=0, challenge=0, quiz=0, display_name=None, avatar_url=None):
    return UserProfile.objects.create(
        user=user,
        display_name=display_name,
        avatar_url=avatar_url,
        total_learning_point=learning,
        total_challenge_point=challenge,
        total_quiz_point=quiz,
    )


@pytest.mark.django_db
class TestLeaderboardTask11_1API:
    def test_leaderboard_alias_routes_return_same_payload(self, member_client, member_user):
        create_profile(member_user, learning=80, challenge=50, quiz=30, display_name='Member One')

        other_user = member_user.__class__.objects.create_user(
            username='leader_other',
            password='StrongPass123!',
            email='leader_other@example.com',
        )
        create_profile(other_user, learning=40, challenge=20, quiz=10, display_name='Other User')

        stats_response = member_client.get('/api/stats/leaderboard/?type=overall&page=1')
        legacy_response = member_client.get('/api/leaderboard/?type=overall&page=1')

        assert stats_response.status_code == 200
        assert legacy_response.status_code == 200
        assert stats_response.data == legacy_response.data

    def test_dense_rank_ties_and_delta(self, member_client, member_user):
        create_profile(member_user, learning=0, challenge=120, quiz=0, display_name='Alice')

        tied_user = member_user.__class__.objects.create_user(
            username='leader_tied',
            password='StrongPass123!',
            email='leader_tied@example.com',
        )
        create_profile(tied_user, learning=0, challenge=120, quiz=0, display_name='Bob')

        lower_user = member_user.__class__.objects.create_user(
            username='leader_lower',
            password='StrongPass123!',
            email='leader_lower@example.com',
        )
        create_profile(lower_user, learning=0, challenge=90, quiz=0, display_name='Charlie')

        lowest_user = member_user.__class__.objects.create_user(
            username='leader_lowest',
            password='StrongPass123!',
            email='leader_lowest@example.com',
        )
        create_profile(lowest_user, learning=0, challenge=70, quiz=0, display_name='Delta')

        response = member_client.get('/api/stats/leaderboard/?type=challenge&page=1&limit=10')

        assert response.status_code == 200
        results = response.data['results']
        assert [item['rank'] for item in results] == [1, 1, 2, 3]
        assert [item['score'] for item in results] == [120, 120, 90, 70]
        assert [item['delta'] for item in results] == [0, 30, 20, 0]

    def test_overall_leaderboard_returns_my_rank_and_total_users(self, member_client, member_user):
        create_profile(member_user, learning=10, challenge=20, quiz=30, display_name='Current Member')

        higher_user = member_user.__class__.objects.create_user(
            username='leader_higher',
            password='StrongPass123!',
            email='leader_higher@example.com',
        )
        create_profile(higher_user, learning=40, challenge=30, quiz=20, display_name='Higher Member')

        lower_user = member_user.__class__.objects.create_user(
            username='leader_lower_overall',
            password='StrongPass123!',
            email='leader_lower_overall@example.com',
        )
        create_profile(lower_user, learning=5, challenge=5, quiz=5, display_name='Lower Member')

        response = member_client.get('/api/stats/leaderboard/?type=overall&page=1')

        assert response.status_code == 200
        assert response.data['type'] == 'overall'
        assert response.data['total_users'] == 3
        assert response.data['my_rank'] == 2
        assert response.data['total_count'] == 3
        assert response.data['results'][0]['score'] == 90
        assert response.data['results'][1]['score'] == 60

    def test_legacy_type_alias_and_offset_pagination(self, member_client, member_user):
        create_profile(member_user, learning=100, challenge=1, quiz=1, display_name='First')

        second_user = member_user.__class__.objects.create_user(
            username='leader_second',
            password='StrongPass123!',
            email='leader_second@example.com',
        )
        create_profile(second_user, learning=80, challenge=2, quiz=2, display_name='Second')

        third_user = member_user.__class__.objects.create_user(
            username='leader_third',
            password='StrongPass123!',
            email='leader_third@example.com',
        )
        create_profile(third_user, learning=60, challenge=3, quiz=3, display_name='Third')

        response = member_client.get('/api/leaderboard/?sort_by=learning&limit=1&offset=1')

        assert response.status_code == 200
        assert response.data['type'] == 'course'
        assert response.data['page_size'] == 1
        assert response.data['results'][0]['user']['username'] == 'leader_second'
        assert response.data['entries'] == response.data['results']

    def test_invalid_type_returns_400(self, member_client, member_user):
        create_profile(member_user, learning=10, challenge=10, quiz=10)

        response = member_client.get('/api/stats/leaderboard/?type=unknown')

        assert response.status_code == 400
        assert response.data['type'] == 'Invalid leaderboard type.'

    def test_authentication_required(self, api_client):
        response = api_client.get('/api/stats/leaderboard/?type=challenge')
        assert response.status_code == 401