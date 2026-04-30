import pytest
from rest_framework.test import APIClient

from api.models import Challenge, ChallengeCategory, ChallengeTag, Role, UserRole

pytestmark = pytest.mark.integration


def _assign_role(user, role_name):
    role, _ = Role.objects.get_or_create(name=role_name, defaults={'is_system': True})
    UserRole.objects.get_or_create(user=user, role=role)


def _results(response):
    data = response.data
    if isinstance(data, dict) and 'results' in data:
        return data['results']
    return data


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def category(db):
    return ChallengeCategory.objects.create(name='Web Security')


@pytest.fixture
def tag(db):
    return ChallengeTag.objects.create(name='xss')


@pytest.fixture
def published_challenge(db, category):
    return Challenge.objects.create(
        slug='published-challenge',
        title='Published Challenge',
        status=Challenge.Status.PUBLISHED,
        difficulty=Challenge.Difficulty.EASY,
        category=category,
        storage_path='challenges/published',
    )


@pytest.fixture
def draft_challenge(db, category):
    return Challenge.objects.create(
        slug='draft-challenge',
        title='Draft Challenge',
        status=Challenge.Status.DRAFT,
        difficulty=Challenge.Difficulty.MEDIUM,
        category=category,
        storage_path='challenges/draft',
    )


# ---------------------------------------------------------------------------
# Visibility tests
# ---------------------------------------------------------------------------

def test_member_list_sees_only_published(member_client, member_user, published_challenge, draft_challenge):
    _assign_role(member_user, 'Member')

    response = member_client.get('/api/challenge/challenges/')

    assert response.status_code == 200
    results = _results(response)
    slugs = [r['slug'] for r in results]
    assert 'published-challenge' in slugs
    assert 'draft-challenge' not in slugs


def test_member_status_filter_cannot_expose_draft(member_client, member_user, published_challenge, draft_challenge):
    _assign_role(member_user, 'Member')

    response = member_client.get('/api/challenge/challenges/?status=draft')

    assert response.status_code == 200
    results = _results(response)
    for r in results:
        assert r['status'] == Challenge.Status.PUBLISHED


def test_editor_list_sees_all_statuses(editor_client, editor_user, published_challenge, draft_challenge):
    _assign_role(editor_user, 'Editor')

    response = editor_client.get('/api/challenge/challenges/')

    assert response.status_code == 200
    results = _results(response)
    slugs = [r['slug'] for r in results]
    assert 'published-challenge' in slugs
    assert 'draft-challenge' in slugs


def test_member_retrieve_published(member_client, member_user, published_challenge):
    _assign_role(member_user, 'Member')

    response = member_client.get(f'/api/challenge/challenges/{published_challenge.slug}/')

    assert response.status_code == 200
    assert response.data['slug'] == published_challenge.slug


# ---------------------------------------------------------------------------
# Challenge CRUD
# ---------------------------------------------------------------------------

def test_editor_can_create_challenge(editor_client, editor_user, category):
    _assign_role(editor_user, 'Editor')

    response = editor_client.post(
        '/api/challenge/challenges/',
        {
            'slug': 'new-challenge',
            'title': 'New Challenge',
            'description': 'A test challenge',
            'status': Challenge.Status.DRAFT,
            'difficulty': Challenge.Difficulty.EASY,
            'category_id': category.id,
            'storage_path': 'challenges/new',
        },
        format='json',
    )

    assert response.status_code == 201
    assert response.data['slug'] == 'new-challenge'
    assert Challenge.objects.filter(slug='new-challenge').exists()


def test_member_cannot_create_challenge(member_client, member_user, category):
    _assign_role(member_user, 'Member')

    response = member_client.post(
        '/api/challenge/challenges/',
        {
            'slug': 'member-challenge',
            'title': 'Member Challenge',
            'status': Challenge.Status.DRAFT,
            'difficulty': Challenge.Difficulty.EASY,
            'storage_path': 'challenges/member',
        },
        format='json',
    )

    assert response.status_code == 403


def test_slug_conflict_returns_409_with_suggestions(editor_client, editor_user, published_challenge, category):
    _assign_role(editor_user, 'Editor')

    response = editor_client.post(
        '/api/challenge/challenges/',
        {
            'slug': published_challenge.slug,
            'title': 'Duplicate Slug',
            'status': Challenge.Status.DRAFT,
            'difficulty': Challenge.Difficulty.EASY,
            'storage_path': 'challenges/dup',
        },
        format='json',
    )

    assert response.status_code == 409
    assert 'suggestions' in response.data
    assert isinstance(response.data['suggestions'], list)
    assert len(response.data['suggestions']) > 0


def test_slug_is_immutable_after_creation(editor_client, editor_user, published_challenge):
    _assign_role(editor_user, 'Editor')

    response = editor_client.put(
        f'/api/challenge/challenges/{published_challenge.slug}/',
        {
            'slug': 'different-slug',
            'title': published_challenge.title,
            'status': published_challenge.status,
            'difficulty': published_challenge.difficulty,
            'storage_path': published_challenge.storage_path,
        },
        format='json',
    )

    assert response.status_code == 400


def test_editor_can_update_challenge(editor_client, editor_user, published_challenge):
    _assign_role(editor_user, 'Editor')

    response = editor_client.put(
        f'/api/challenge/challenges/{published_challenge.slug}/',
        {
            'slug': published_challenge.slug,
            'title': 'Updated Title',
            'status': published_challenge.status,
            'difficulty': published_challenge.difficulty,
            'storage_path': published_challenge.storage_path,
        },
        format='json',
    )

    assert response.status_code == 200
    assert response.data['title'] == 'Updated Title'


def test_editor_archive_challenge(editor_client, editor_user, published_challenge):
    _assign_role(editor_user, 'Editor')

    response = editor_client.delete(
        f'/api/challenge/challenges/{published_challenge.slug}/?mode=archive'
    )

    assert response.status_code == 204
    published_challenge.refresh_from_db()
    assert published_challenge.status == Challenge.Status.ARCHIVED


def test_editor_purge_challenge(editor_client, editor_user, draft_challenge):
    _assign_role(editor_user, 'Editor')

    slug = draft_challenge.slug
    response = editor_client.delete(
        f'/api/challenge/challenges/{slug}/?mode=purge'
    )

    assert response.status_code == 204
    assert not Challenge.objects.filter(slug=slug).exists()


# ---------------------------------------------------------------------------
# Category CRUD
# ---------------------------------------------------------------------------

def test_anyone_can_list_categories(member_client, member_user, category):
    _assign_role(member_user, 'Member')

    response = member_client.get('/api/challenge/categories/')

    assert response.status_code == 200


def test_editor_can_create_category(editor_client, editor_user):
    _assign_role(editor_user, 'Editor')

    response = editor_client.post(
        '/api/challenge/categories/',
        {'name': 'Forensics', 'description': 'Digital forensics challenges'},
        format='json',
    )

    assert response.status_code == 201
    assert ChallengeCategory.objects.filter(name='Forensics').exists()


def test_member_cannot_create_category(member_client, member_user):
    _assign_role(member_user, 'Member')

    response = member_client.post(
        '/api/challenge/categories/',
        {'name': 'Should Fail'},
        format='json',
    )

    assert response.status_code == 403


def test_duplicate_category_name_rejected(editor_client, editor_user, category):
    _assign_role(editor_user, 'Editor')

    response = editor_client.post(
        '/api/challenge/categories/',
        {'name': category.name},
        format='json',
    )

    assert response.status_code == 400


def test_category_name_case_insensitive_unique(editor_client, editor_user, category):
    _assign_role(editor_user, 'Editor')

    response = editor_client.post(
        '/api/challenge/categories/',
        {'name': category.name.upper()},
        format='json',
    )

    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Tag CRUD
# ---------------------------------------------------------------------------

def test_anyone_can_list_tags(member_client, member_user, tag):
    _assign_role(member_user, 'Member')

    response = member_client.get('/api/challenge/tags/')

    assert response.status_code == 200


def test_editor_can_create_tag(editor_client, editor_user):
    _assign_role(editor_user, 'Editor')

    response = editor_client.post(
        '/api/challenge/tags/',
        {'name': 'sql-injection'},
        format='json',
    )

    assert response.status_code == 201
    assert ChallengeTag.objects.filter(name='sql-injection').exists()


def test_member_cannot_create_tag(member_client, member_user):
    _assign_role(member_user, 'Member')

    response = member_client.post(
        '/api/challenge/tags/',
        {'name': 'should-fail'},
        format='json',
    )

    assert response.status_code == 403


def test_duplicate_tag_name_rejected(editor_client, editor_user, tag):
    _assign_role(editor_user, 'Editor')

    response = editor_client.post(
        '/api/challenge/tags/',
        {'name': tag.name},
        format='json',
    )

    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Tag assignment on challenges
# ---------------------------------------------------------------------------

def test_create_challenge_with_tags(editor_client, editor_user, category, tag):
    _assign_role(editor_user, 'Editor')

    response = editor_client.post(
        '/api/challenge/challenges/',
        {
            'slug': 'tagged-challenge',
            'title': 'Tagged Challenge',
            'status': Challenge.Status.DRAFT,
            'difficulty': Challenge.Difficulty.EASY,
            'storage_path': 'challenges/tagged',
            'tag_ids': [tag.id],
        },
        format='json',
    )

    assert response.status_code == 201
    challenge = Challenge.objects.get(slug='tagged-challenge')
    tag_ids = list(challenge.tag_mappings.values_list('tag_id', flat=True))
    assert tag.id in tag_ids


def test_update_challenge_replaces_tags(editor_client, editor_user, published_challenge, tag):
    _assign_role(editor_user, 'Editor')

    new_tag = ChallengeTag.objects.create(name='new-tag')

    editor_client.put(
        f'/api/challenge/challenges/{published_challenge.slug}/',
        {
            'slug': published_challenge.slug,
            'title': published_challenge.title,
            'status': published_challenge.status,
            'difficulty': published_challenge.difficulty,
            'storage_path': published_challenge.storage_path,
            'tag_ids': [new_tag.id],
        },
        format='json',
    )

    tag_ids = list(published_challenge.tag_mappings.values_list('tag_id', flat=True))
    assert new_tag.id in tag_ids
    assert tag.id not in tag_ids


def test_invalid_tag_ids_rejected(editor_client, editor_user, category):
    _assign_role(editor_user, 'Editor')

    response = editor_client.post(
        '/api/challenge/challenges/',
        {
            'slug': 'bad-tags',
            'title': 'Bad Tags',
            'status': Challenge.Status.DRAFT,
            'difficulty': Challenge.Difficulty.EASY,
            'storage_path': 'challenges/bad',
            'tag_ids': [99999],
        },
        format='json',
    )

    assert response.status_code == 400
