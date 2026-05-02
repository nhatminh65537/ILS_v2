import pytest

from api.models import Challenge, ChallengeCategory, ChallengeFlag, Role, UserRole

pytestmark = pytest.mark.integration


def _assign_role(user, role_name):
    role, _ = Role.objects.get_or_create(name=role_name, defaults={'is_system': True})
    UserRole.objects.get_or_create(user=user, role=role)


def _flags_url(slug):
    return f'/api/challenge/challenges/{slug}/flags/'


def _flag_detail_url(slug, flag_id):
    return f'/api/challenge/challenges/{slug}/flags/{flag_id}/'


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def category(db):
    return ChallengeCategory.objects.create(name='Web')


@pytest.fixture
def challenge(db, category):
    return Challenge.objects.create(
        slug='flag-test-challenge',
        title='Flag Test Challenge',
        status=Challenge.Status.PUBLISHED,
        difficulty=Challenge.Difficulty.EASY,
        category=category,
        storage_path='challenges/flag-test',
    )


# ---------------------------------------------------------------------------
# Static flag plaintext storage
# ---------------------------------------------------------------------------

def test_editor_create_static_flag_stores_plaintext(editor_client, editor_user, challenge):
    _assign_role(editor_user, 'Editor')

    resp = editor_client.post(
        _flags_url(challenge.slug),
        {'flag_value': 'FLAG{secret}', 'is_regex': False, 'is_case_sensitive': True, 'random_tail_length': 0},
        format='json',
    )

    assert resp.status_code == 201
    flag = ChallengeFlag.objects.get(challenge=challenge)
    assert flag.flag_value == 'FLAG{secret}'


def test_static_flag_case_insensitive_stored_as_original(editor_client, editor_user, challenge):
    _assign_role(editor_user, 'Editor')

    resp = editor_client.post(
        _flags_url(challenge.slug),
        {'flag_value': 'FLAG{Secret}', 'is_regex': False, 'is_case_sensitive': False, 'random_tail_length': 0},
        format='json',
    )

    assert resp.status_code == 201
    flag = ChallengeFlag.objects.get(challenge=challenge)
    # Stored as-is; case folding happens at comparison time, not storage time
    assert flag.flag_value == 'FLAG{Secret}'


# ---------------------------------------------------------------------------
# Regex flag plaintext storage
# ---------------------------------------------------------------------------

def test_editor_create_regex_flag_stores_plaintext(editor_client, editor_user, challenge):
    _assign_role(editor_user, 'Editor')
    pattern = r'FLAG\{[a-z0-9]+\}'

    resp = editor_client.post(
        _flags_url(challenge.slug),
        {'flag_value': pattern, 'is_regex': True, 'is_case_sensitive': True, 'random_tail_length': 0},
        format='json',
    )

    assert resp.status_code == 201
    flag = ChallengeFlag.objects.get(challenge=challenge)
    assert flag.flag_value == pattern


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def test_invalid_regex_returns_400(editor_client, editor_user, challenge):
    _assign_role(editor_user, 'Editor')

    resp = editor_client.post(
        _flags_url(challenge.slug),
        {'flag_value': '[invalid(', 'is_regex': True, 'is_case_sensitive': True, 'random_tail_length': 0},
        format='json',
    )

    assert resp.status_code == 400


def test_empty_flag_value_returns_400(editor_client, editor_user, challenge):
    _assign_role(editor_user, 'Editor')

    resp = editor_client.post(
        _flags_url(challenge.slug),
        {'flag_value': '   ', 'is_regex': False, 'is_case_sensitive': True, 'random_tail_length': 0},
        format='json',
    )

    assert resp.status_code == 400


def test_negative_random_tail_length_returns_400(editor_client, editor_user, challenge):
    _assign_role(editor_user, 'Editor')

    resp = editor_client.post(
        _flags_url(challenge.slug),
        {'flag_value': 'FLAG{x}', 'is_regex': False, 'is_case_sensitive': True, 'random_tail_length': -1},
        format='json',
    )

    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Member access denied (403)
# ---------------------------------------------------------------------------

def test_member_cannot_list_flags(member_client, member_user, challenge):
    _assign_role(member_user, 'Member')

    assert member_client.get(_flags_url(challenge.slug)).status_code == 403


def test_member_cannot_create_flag(member_client, member_user, challenge):
    _assign_role(member_user, 'Member')

    resp = member_client.post(
        _flags_url(challenge.slug),
        {'flag_value': 'FLAG{x}', 'is_regex': False, 'is_case_sensitive': True, 'random_tail_length': 0},
        format='json',
    )
    assert resp.status_code == 403


def test_member_cannot_update_flag(member_client, member_user, challenge):
    _assign_role(member_user, 'Member')
    flag = ChallengeFlag.objects.create(
        challenge=challenge, flag_value='FLAG{original}', is_regex=False, random_tail_length=0
    )

    resp = member_client.put(
        _flag_detail_url(challenge.slug, flag.id),
        {'flag_value': 'FLAG{new}', 'is_regex': False, 'is_case_sensitive': True, 'random_tail_length': 0},
        format='json',
    )
    assert resp.status_code == 403


def test_member_cannot_delete_flag(member_client, member_user, challenge):
    _assign_role(member_user, 'Member')
    flag = ChallengeFlag.objects.create(
        challenge=challenge, flag_value='FLAG{original}', is_regex=False, random_tail_length=0
    )

    assert member_client.delete(_flag_detail_url(challenge.slug, flag.id)).status_code == 403


# ---------------------------------------------------------------------------
# flag_value visibility
# ---------------------------------------------------------------------------

def test_flag_value_visible_to_editor(editor_client, editor_user, challenge):
    _assign_role(editor_user, 'Editor')
    ChallengeFlag.objects.create(
        challenge=challenge, flag_value='FLAG{visible}', is_regex=False, random_tail_length=0
    )

    resp = editor_client.get(_flags_url(challenge.slug))

    assert resp.status_code == 200
    assert len(resp.data) == 1
    assert 'flag_value' in resp.data[0]
    assert resp.data[0]['flag_value'] == 'FLAG{visible}'


# ---------------------------------------------------------------------------
# Update (PUT/PATCH) stores new flag_value as plaintext
# ---------------------------------------------------------------------------

def test_editor_can_update_flag(editor_client, editor_user, challenge):
    _assign_role(editor_user, 'Editor')
    flag = ChallengeFlag.objects.create(
        challenge=challenge,
        flag_value='FLAG{old}',
        is_regex=False,
        random_tail_length=0,
    )

    resp = editor_client.put(
        _flag_detail_url(challenge.slug, flag.id),
        {'flag_value': 'FLAG{new}', 'is_regex': False, 'is_case_sensitive': True, 'random_tail_length': 0},
        format='json',
    )

    assert resp.status_code == 200
    flag.refresh_from_db()
    assert flag.flag_value == 'FLAG{new}'


def test_editor_can_delete_flag(editor_client, editor_user, challenge):
    _assign_role(editor_user, 'Editor')
    flag = ChallengeFlag.objects.create(
        challenge=challenge, flag_value='FLAG{delete-me}', is_regex=False, random_tail_length=0
    )

    resp = editor_client.delete(_flag_detail_url(challenge.slug, flag.id))

    assert resp.status_code == 204
    assert not ChallengeFlag.objects.filter(id=flag.id).exists()


def test_flag_detail_wrong_challenge_returns_404(editor_client, editor_user, challenge, category):
    _assign_role(editor_user, 'Editor')
    other = Challenge.objects.create(
        slug='other-challenge',
        title='Other',
        status=Challenge.Status.PUBLISHED,
        difficulty=Challenge.Difficulty.EASY,
        category=category,
        storage_path='challenges/other',
    )
    flag = ChallengeFlag.objects.create(
        challenge=other, flag_value='FLAG{other}', is_regex=False, random_tail_length=0
    )

    resp = editor_client.put(
        _flag_detail_url(challenge.slug, flag.id),
        {'flag_value': 'FLAG{x}', 'is_regex': False, 'is_case_sensitive': True, 'random_tail_length': 0},
        format='json',
    )
    assert resp.status_code == 404
