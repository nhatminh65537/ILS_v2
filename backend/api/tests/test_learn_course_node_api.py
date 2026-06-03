import pytest

from api.models import Course, CourseCategory, CourseNode, Lesson, Role, SystemConfig, UserRole


pytestmark = pytest.mark.integration


def _assign_role(user, role_name):
    role, _ = Role.objects.get_or_create(name=role_name, defaults={'is_system': True})
    UserRole.objects.get_or_create(user=user, role=role)


@pytest.fixture
def published_course(db):
    category = CourseCategory.objects.create(name='Published Category')
    return Course.objects.create(
        slug='published-course-nodes',
        title='Published Course',
        status=Course.Status.PUBLISHED,
        category=category,
    )


@pytest.fixture
def draft_course(db):
    category = CourseCategory.objects.create(name='Draft Category')
    return Course.objects.create(
        slug='draft-course-nodes',
        title='Draft Course',
        status=Course.Status.DRAFT,
        category=category,
    )


def test_member_node_visibility_published_only(member_client, member_user, published_course, draft_course):
    _assign_role(member_user, 'Member')

    response = member_client.get(f'/api/learn/courses/{published_course.slug}/nodes/')
    assert response.status_code == 200

    response = member_client.get(f'/api/learn/courses/{draft_course.slug}/nodes/')
    assert response.status_code == 404


def test_editor_can_read_nodes_for_draft(editor_client, editor_user, draft_course):
    _assign_role(editor_user, 'Editor')

    response = editor_client.get(f'/api/learn/courses/{draft_course.slug}/nodes/')
    assert response.status_code == 200


def test_editor_can_create_folder_and_item_nodes_atomically(editor_client, editor_user, published_course):
    _assign_role(editor_user, 'Editor')

    published_course.refresh_from_db()
    assert published_course.structure_version == 1

    folder_response = editor_client.post(
        f'/api/learn/courses/{published_course.slug}/nodes/',
        {'title': 'Folder A', 'parent_id': None, 'position': 0, 'is_item': False},
        format='json',
    )
    assert folder_response.status_code == 201
    folder_id = folder_response.data['id']
    assert folder_response.data['path'] == ''
    assert folder_response.data['has_children'] is False

    published_course.refresh_from_db()
    assert published_course.structure_version == 2

    item_response = editor_client.post(
        f'/api/learn/courses/{published_course.slug}/nodes/',
        {
            'title': 'Lesson Node',
            'parent_id': folder_id,
            'position': 0,
            'is_item': True,
            'lesson': {
                'lesson_type': Lesson.LessonType.MARKDOWN,
                'content_md': '# Hello',
            },
        },
        format='json',
    )
    assert item_response.status_code == 201
    assert item_response.data['is_item'] is True
    assert item_response.data['path'] == str(folder_id)
    assert item_response.data['lesson']['lesson_type'] == Lesson.LessonType.MARKDOWN
    assert item_response.data['lesson']['title'] == 'Lesson Node'

    node = CourseNode.objects.get(id=item_response.data['id'])
    assert node.lesson_id is not None
    assert Lesson.objects.filter(id=node.lesson_id).exists()

    published_course.refresh_from_db()
    assert published_course.structure_version == 3


def test_move_updates_descendant_paths(editor_client, editor_user, published_course):
    _assign_role(editor_user, 'Editor')

    root_a = editor_client.post(
        f'/api/learn/courses/{published_course.slug}/nodes/',
        {'title': 'Root A', 'parent_id': None, 'position': 0, 'is_item': False},
        format='json',
    ).data
    child = editor_client.post(
        f'/api/learn/courses/{published_course.slug}/nodes/',
        {'title': 'Child', 'parent_id': root_a['id'], 'position': 0, 'is_item': False},
        format='json',
    ).data
    grandchild = editor_client.post(
        f'/api/learn/courses/{published_course.slug}/nodes/',
        {'title': 'Grand', 'parent_id': child['id'], 'position': 0, 'is_item': False},
        format='json',
    ).data
    item = editor_client.post(
        f'/api/learn/courses/{published_course.slug}/nodes/',
        {
            'title': 'Leaf Lesson',
            'parent_id': grandchild['id'],
            'position': 0,
            'is_item': True,
            'lesson': {
                'lesson_type': Lesson.LessonType.MARKDOWN,
                'content_md': 'x',
            },
        },
        format='json',
    ).data

    root_b = editor_client.post(
        f'/api/learn/courses/{published_course.slug}/nodes/',
        {'title': 'Root B', 'parent_id': None, 'position': 0, 'is_item': False},
        format='json',
    ).data

    move_response = editor_client.put(
        f'/api/learn/courses/{published_course.slug}/nodes/{child["id"]}/',
        {'parent_id': root_b['id']},
        format='json',
    )
    assert move_response.status_code == 200

    moved_child = CourseNode.objects.get(id=child['id'])
    moved_grandchild = CourseNode.objects.get(id=grandchild['id'])
    moved_item = CourseNode.objects.get(id=item['id'])

    assert moved_child.path == str(root_b['id'])
    expected_child_prefix = f'{moved_child.path}.{moved_child.id}'

    assert moved_grandchild.path == expected_child_prefix
    assert moved_item.path.startswith(f'{expected_child_prefix}.')


def test_max_depth_enforced_on_create(editor_client, editor_user, published_course):
    _assign_role(editor_user, 'Editor')

    SystemConfig.objects.update_or_create(
        key='learn.max_tree_depth',
        defaults={
            'value': 1,
            'value_type': SystemConfig.ConfigType.INT,
            'category': 'learn',
            'is_runtime': True,
            'is_editable': True,
        },
    )

    root = editor_client.post(
        f'/api/learn/courses/{published_course.slug}/nodes/',
        {'title': 'Root', 'parent_id': None, 'position': 0, 'is_item': False},
        format='json',
    )
    assert root.status_code == 201

    child = editor_client.post(
        f'/api/learn/courses/{published_course.slug}/nodes/',
        {'title': 'Child', 'parent_id': root.data['id'], 'position': 0, 'is_item': False},
        format='json',
    )
    assert child.status_code == 201

    too_deep = editor_client.post(
        f'/api/learn/courses/{published_course.slug}/nodes/',
        {'title': 'Too deep', 'parent_id': child.data['id'], 'position': 0, 'is_item': False},
        format='json',
    )
    assert too_deep.status_code == 400
    assert 'Maximum folder depth exceeded' in str(too_deep.data.get('detail', ''))


def test_delete_subtree_removes_lessons(editor_client, editor_user, published_course):
    _assign_role(editor_user, 'Editor')

    folder = editor_client.post(
        f'/api/learn/courses/{published_course.slug}/nodes/',
        {'title': 'DeleteMe', 'parent_id': None, 'position': 0, 'is_item': False},
        format='json',
    ).data

    item = editor_client.post(
        f'/api/learn/courses/{published_course.slug}/nodes/',
        {
            'title': 'Lesson X',
            'parent_id': folder['id'],
            'position': 0,
            'is_item': True,
            'lesson': {
                'lesson_type': Lesson.LessonType.MARKDOWN,
                'content_md': 'x',
            },
        },
        format='json',
    ).data

    lesson_id = item['lesson']['id']
    assert Lesson.objects.filter(id=lesson_id).exists()

    delete_response = editor_client.delete(f'/api/learn/courses/{published_course.slug}/nodes/{folder["id"]}/')
    assert delete_response.status_code == 204

    assert not CourseNode.objects.filter(id=folder['id']).exists()
    assert not Lesson.objects.filter(id=lesson_id).exists()


def _create_folder(client, slug, title, parent_id=None):
    return client.post(
        f'/api/learn/courses/{slug}/nodes/',
        {'title': title, 'parent_id': parent_id, 'is_item': False},
        format='json',
    ).data


def _create_lesson_node(client, slug, title, parent_id=None):
    return client.post(
        f'/api/learn/courses/{slug}/nodes/',
        {
            'title': title,
            'parent_id': parent_id,
            'is_item': True,
            'lesson': {'lesson_type': Lesson.LessonType.MARKDOWN, 'content_md': 'x'},
        },
        format='json',
    ).data


def test_list_sorts_folders_before_lessons(editor_client, editor_user, published_course):
    _assign_role(editor_user, 'Editor')

    # Create a lesson first, then a folder — folder must still come first.
    lesson = _create_lesson_node(editor_client, published_course.slug, 'Lesson 1')
    folder = _create_folder(editor_client, published_course.slug, 'Folder 1')

    response = editor_client.get(f'/api/learn/courses/{published_course.slug}/nodes/')
    assert response.status_code == 200
    ids = [node['id'] for node in response.data]
    assert ids.index(folder['id']) < ids.index(lesson['id'])


def test_create_node_defaults_position_to_end(editor_client, editor_user, published_course):
    _assign_role(editor_user, 'Editor')

    first = _create_folder(editor_client, published_course.slug, 'A')
    second = _create_folder(editor_client, published_course.slug, 'B')
    third = _create_folder(editor_client, published_course.slug, 'C')

    assert CourseNode.objects.get(id=first['id']).position == 0
    assert CourseNode.objects.get(id=second['id']).position == 1
    assert CourseNode.objects.get(id=third['id']).position == 2


def test_reorder_reindexes_siblings(editor_client, editor_user, published_course):
    _assign_role(editor_user, 'Editor')

    a = _create_folder(editor_client, published_course.slug, 'A')
    b = _create_folder(editor_client, published_course.slug, 'B')
    c = _create_folder(editor_client, published_course.slug, 'C')

    # New order: C, A, B
    response = editor_client.post(
        f'/api/learn/courses/{published_course.slug}/nodes/reorder/',
        {'parent_id': None, 'ordered_ids': [c['id'], a['id'], b['id']]},
        format='json',
    )
    assert response.status_code == 204

    assert CourseNode.objects.get(id=c['id']).position == 0
    assert CourseNode.objects.get(id=a['id']).position == 1
    assert CourseNode.objects.get(id=b['id']).position == 2


def test_reorder_rejects_mismatched_sibling_set(editor_client, editor_user, published_course):
    _assign_role(editor_user, 'Editor')

    a = _create_folder(editor_client, published_course.slug, 'A')
    b = _create_folder(editor_client, published_course.slug, 'B')

    # Missing one sibling -> 400
    response = editor_client.post(
        f'/api/learn/courses/{published_course.slug}/nodes/reorder/',
        {'parent_id': None, 'ordered_ids': [a['id']]},
        format='json',
    )
    assert response.status_code == 400

    # Foreign id mixed in -> 400
    response = editor_client.post(
        f'/api/learn/courses/{published_course.slug}/nodes/reorder/',
        {'parent_id': None, 'ordered_ids': [a['id'], b['id'], 99999]},
        format='json',
    )
    assert response.status_code == 400


def test_rename_item_node_syncs_lesson_title(editor_client, editor_user, published_course):
    _assign_role(editor_user, 'Editor')

    item = _create_lesson_node(editor_client, published_course.slug, 'Original Title')
    lesson_id = item['lesson']['id']
    assert Lesson.objects.get(id=lesson_id).title == 'Original Title'

    response = editor_client.put(
        f'/api/learn/courses/{published_course.slug}/nodes/{item["id"]}/',
        {'title': 'Renamed Title'},
        format='json',
    )
    assert response.status_code == 200

    assert CourseNode.objects.get(id=item['id']).title == 'Renamed Title'
    assert Lesson.objects.get(id=lesson_id).title == 'Renamed Title'
