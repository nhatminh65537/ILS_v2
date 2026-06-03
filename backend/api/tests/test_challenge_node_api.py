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


def test_editor_create_item_node_auto_creates_draft_challenge(editor_client, editor_user):
    _assign_role(editor_user, 'Editor')

    create_response = editor_client.post(
        '/api/challenge/nodes/',
        {
            'title': 'Challenge Item',
            'is_item': True,
        },
        format='json',
    )

    assert create_response.status_code == 201
    assert create_response.data['is_item'] is True

    challenge_id = create_response.data['challenge']
    assert challenge_id is not None

    # The item create atomically materialises a draft Challenge from the title.
    challenge = Challenge.objects.get(id=challenge_id)
    assert challenge.status == Challenge.Status.DRAFT
    assert challenge.title == 'Challenge Item'
    assert challenge.slug == 'challenge-item'
    assert challenge.storage_path == 'challenges/challenge-item'


def test_children_endpoint_returns_direct_children(editor_client, editor_user):
    _assign_role(editor_user, 'Editor')

    parent_response = editor_client.post(
        '/api/challenge/nodes/',
        {'title': 'Parent', 'is_item': False},
        format='json',
    )
    parent_id = parent_response.data['id']

    child_response = editor_client.post(
        '/api/challenge/nodes/',
        {
            'title': 'Child',
            'parent_id': parent_id,
            'is_item': False,
        },
        format='json',
    )

    assert child_response.status_code == 201
    assert child_response.data['path'] == str(parent_id)

    children_response = editor_client.get(f'/api/challenge/nodes/{parent_id}/children/')
    assert children_response.status_code == 200
    assert len(children_response.data) == 1
    assert children_response.data[0]['id'] == child_response.data['id']


def test_root_list_sorts_folders_first_then_title(editor_client, editor_user):
    _assign_role(editor_user, 'Editor')

    # Create out of alphabetical order, mixing folders and items.
    editor_client.post('/api/challenge/nodes/', {'title': 'Zeta folder', 'is_item': False}, format='json')
    editor_client.post('/api/challenge/nodes/', {'title': 'Alpha item', 'is_item': True}, format='json')
    editor_client.post('/api/challenge/nodes/', {'title': 'Beta folder', 'is_item': False}, format='json')

    list_response = editor_client.get('/api/challenge/nodes/')
    titles = [row['title'] for row in list_response.data['results']]

    # Folders (Beta, Zeta) before the item (Alpha item); each group A->Z.
    assert titles == ['Beta folder', 'Zeta folder', 'Alpha item']


def test_move_updates_descendant_paths(editor_client, editor_user):
    _assign_role(editor_user, 'Editor')

    root_a = editor_client.post(
        '/api/challenge/nodes/',
        {'title': 'Root A', 'is_item': False},
        format='json',
    ).data

    child = editor_client.post(
        '/api/challenge/nodes/',
        {'title': 'Child', 'parent_id': root_a['id'], 'is_item': False},
        format='json',
    ).data

    grandchild = editor_client.post(
        '/api/challenge/nodes/',
        {'title': 'Grandchild', 'parent_id': child['id'], 'is_item': False},
        format='json',
    ).data

    root_b = editor_client.post(
        '/api/challenge/nodes/',
        {'title': 'Root B', 'is_item': False},
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

    root = editor_client.post(
        '/api/challenge/nodes/',
        {'title': 'Root', 'is_item': False},
        format='json',
    ).data
    child = editor_client.post(
        '/api/challenge/nodes/',
        {'title': 'Child', 'parent_id': root['id'], 'is_item': False},
        format='json',
    ).data

    response = editor_client.post(
        f'/api/challenge/nodes/{root["id"]}/move/',
        {'parent_id': child['id']},
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


def test_explorer_root_returns_folders_and_visible_items(editor_client, editor_user, member_client, member_user):
    _assign_role(editor_user, 'Editor')
    _assign_role(member_user, 'Member')

    # Editor builds a folder + a draft item at root.
    folder = editor_client.post(
        '/api/challenge/nodes/', {'title': 'Web', 'is_item': False}, format='json'
    ).data
    item = editor_client.post(
        '/api/challenge/nodes/', {'title': 'Login Bypass', 'is_item': True}, format='json'
    ).data

    # Draft item is hidden from members; publish it so it shows in the explorer.
    challenge = Challenge.objects.get(id=item['challenge'])
    challenge.status = Challenge.Status.PUBLISHED
    challenge.save(update_fields=['status'])

    response = member_client.get('/api/challenge/nodes/explorer/')
    assert response.status_code == 200
    assert response.data['folder'] is None
    titles = [n['title'] for n in response.data['nodes']]
    # Folder first, then the published item.
    assert titles == ['Web', 'Login Bypass']

    item_node = response.data['nodes'][1]
    assert item_node['challenge']['slug'] == challenge.slug
    assert item_node['challenge']['is_solved'] is False


def test_explorer_hides_draft_items_from_members(editor_client, editor_user, member_client, member_user):
    _assign_role(editor_user, 'Editor')
    _assign_role(member_user, 'Member')

    editor_client.post('/api/challenge/nodes/', {'title': 'Draft Item', 'is_item': True}, format='json')

    response = member_client.get('/api/challenge/nodes/explorer/')
    assert response.status_code == 200
    assert response.data['nodes'] == []


def test_explorer_folder_breadcrumb(editor_client, editor_user):
    _assign_role(editor_user, 'Editor')

    root = editor_client.post(
        '/api/challenge/nodes/', {'title': 'Web', 'is_item': False}, format='json'
    ).data
    sub = editor_client.post(
        '/api/challenge/nodes/', {'title': 'SQLi', 'parent_id': root['id'], 'is_item': False}, format='json'
    ).data

    response = editor_client.get(f'/api/challenge/nodes/{sub["id"]}/explorer/')
    assert response.status_code == 200
    assert response.data['folder']['id'] == sub['id']
    crumb_titles = [c['title'] for c in response.data['breadcrumb']]
    assert crumb_titles == ['Web', 'SQLi']


def test_move_does_not_trigger_n_plus_one(editor_client, editor_user, django_assert_max_num_queries):
    _assign_role(editor_user, 'Editor')

    from api.models import ChallengeNode as _CN
    from api.services.challenge_service import ChallengeService

    root_a = editor_client.post('/api/challenge/nodes/', {'title': 'A', 'is_item': False}, format='json').data
    parent = editor_client.post(
        '/api/challenge/nodes/', {'title': 'P', 'parent_id': root_a['id'], 'is_item': False}, format='json'
    ).data
    # Several descendants under parent.
    for i in range(5):
        editor_client.post(
            '/api/challenge/nodes/', {'title': f'C{i}', 'parent_id': parent['id'], 'is_item': False}, format='json'
        )
    root_b = editor_client.post('/api/challenge/nodes/', {'title': 'B', 'is_item': False}, format='json').data

    node = _CN.objects.get(id=parent['id'])
    new_parent = _CN.objects.get(id=root_b['id'])

    # Bulk move: fetch descendants once + node save + single bulk_update (no per-node save).
    with django_assert_max_num_queries(8):
        ChallengeService.move_challenge_node_bulk(node, new_parent)
