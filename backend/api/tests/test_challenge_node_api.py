import pytest

from api.models import Challenge, ChallengeNode, Role, UserRole


pytestmark = pytest.mark.integration


def _assign_role(user, role_name):
    role, _ = Role.objects.get_or_create(name=role_name, defaults={'is_system': True})
    UserRole.objects.get_or_create(user=user, role=role)


@pytest.fixture
def published_challenge(db):
    return Challenge.objects.create(
        slug='published-challenge',
        title='Published Challenge',
        status=Challenge.Status.PUBLISHED,
        storage_path='uploads/challenges',
    )


def test_editor_can_create_root_and_list_nodes(editor_client, editor_user):
    _assign_role(editor_user, 'Editor')

    create_response = editor_client.post(
        '/api/challenge/nodes/',
        {
            'title': 'Challenge Root',
            'position': 0,
            'is_item': False,
        },
        format='json',
    )

    assert create_response.status_code == 201
    assert create_response.data['title'] == 'Challenge Root'
    assert create_response.data['is_item'] is False
    assert create_response.data['path'] == ''

    list_response = editor_client.get('/api/challenge/nodes/')
    assert list_response.status_code == 200
    assert list_response.data['count'] == 1
    assert list_response.data['results'][0]['id'] == create_response.data['id']


def test_editor_can_create_item_node(editor_client, editor_user, published_challenge):
    _assign_role(editor_user, 'Editor')

    create_response = editor_client.post(
        '/api/challenge/nodes/',
        {
            'title': 'Challenge Item',
            'position': 0,
            'is_item': True,
            'challenge': published_challenge.id,
        },
        format='json',
    )

    assert create_response.status_code == 201
    assert create_response.data['is_item'] is True
    assert create_response.data['challenge'] == published_challenge.id


def test_children_endpoint_returns_direct_children(editor_client, editor_user):
    _assign_role(editor_user, 'Editor')

    parent = ChallengeNode.objects.create(title='Parent', position=0)

    child_response = editor_client.post(
        '/api/challenge/nodes/',
        {
            'title': 'Child',
            'parent': parent.id,
            'position': 0,
            'is_item': False,
        },
        format='json',
    )

    assert child_response.status_code == 201
    assert child_response.data['path'] == str(parent.id)

    children_response = editor_client.get(f'/api/challenge/nodes/{parent.id}/children/')
    assert children_response.status_code == 200
    assert len(children_response.data) == 1
    assert children_response.data[0]['id'] == child_response.data['id']


def test_move_updates_descendant_paths(editor_client, editor_user):
    _assign_role(editor_user, 'Editor')

    root_a = editor_client.post(
        '/api/challenge/nodes/',
        {
            'title': 'Root A',
            'position': 0,
            'is_item': False,
        },
        format='json',
    ).data

    child = editor_client.post(
        '/api/challenge/nodes/',
        {
            'title': 'Child',
            'parent': root_a['id'],
            'position': 0,
            'is_item': False,
        },
        format='json',
    ).data

    grandchild = editor_client.post(
        '/api/challenge/nodes/',
        {
            'title': 'Grandchild',
            'parent': child['id'],
            'position': 0,
            'is_item': False,
        },
        format='json',
    ).data

    root_b = editor_client.post(
        '/api/challenge/nodes/',
        {
            'title': 'Root B',
            'position': 1,
            'is_item': False,
        },
        format='json',
    ).data

    move_response = editor_client.post(
        f'/api/challenge/nodes/{child["id"]}/move/',
        {'parent_id': root_b['id']},
        format='json',
    )

    assert move_response.status_code == 200

    moved_child = ChallengeNode.objects.get(id=child['id'])
    moved_grandchild = ChallengeNode.objects.get(id=grandchild['id'])

    assert moved_child.path == str(root_b['id'])
    expected_prefix = f'{moved_child.path}.{moved_child.id}'
    assert moved_grandchild.path == expected_prefix


def test_move_prevents_cycle(editor_client, editor_user):
    _assign_role(editor_user, 'Editor')

    root = ChallengeNode.objects.create(title='Root', position=0)
    child = ChallengeNode.objects.create(title='Child', parent=root, position=0)

    response = editor_client.post(
        f'/api/challenge/nodes/{root.id}/move/',
        {'parent_id': child.id},
        format='json',
    )

    assert response.status_code == 400
    assert 'cycle' in str(response.data).lower()


def test_member_cannot_create_challenge_node(member_client, member_user):
    _assign_role(member_user, 'Member')

    response = member_client.post(
        '/api/challenge/nodes/',
        {
            'title': 'Should Fail',
            'position': 0,
            'is_item': False,
        },
        format='json',
    )

    assert response.status_code == 403
