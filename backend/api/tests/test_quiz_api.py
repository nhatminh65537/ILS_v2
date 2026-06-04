import pytest

from api.models import Quiz, QuizCategory, QuizNode, QuizQuestion, Role, UserQuizProgress, UserRole


pytestmark = pytest.mark.integration


def _assign_role(user, role_name):
    role, _ = Role.objects.get_or_create(name=role_name, defaults={'is_system': True})
    UserRole.objects.get_or_create(user=user, role=role)


@pytest.fixture
def published_quiz(db):
    return Quiz.objects.create(title='Published Quiz', status=Quiz.Status.PUBLISHED)


@pytest.fixture
def draft_quiz(db):
    return Quiz.objects.create(title='Draft Quiz', status=Quiz.Status.DRAFT)


def test_member_list_quizzes_shows_only_published(member_client, member_user, published_quiz, draft_quiz):
    _assign_role(member_user, 'Member')

    response = member_client.get('/api/quiz/quizzes/')

    assert response.status_code == 200
    assert response.data['count'] == 1
    assert len(response.data['results']) == 1
    assert response.data['results'][0]['id'] == published_quiz.id


def test_member_status_filter_cannot_expose_draft(member_client, member_user, published_quiz, draft_quiz):
    _assign_role(member_user, 'Member')

    # A member cannot read drafts, so explicitly requesting the draft status
    # returns nothing rather than leaking drafts or silently downgrading.
    response = member_client.get('/api/quiz/quizzes/?status=draft')

    assert response.status_code == 200
    assert response.data['count'] == 0


def test_member_default_quiz_list_shows_only_published(member_client, member_user, published_quiz, draft_quiz):
    _assign_role(member_user, 'Member')

    response = member_client.get('/api/quiz/quizzes/')

    assert response.status_code == 200
    assert response.data['count'] == 1
    assert response.data['results'][0]['id'] == published_quiz.id


def test_legacy_quizzes_route_is_removed(member_client, member_user):
    _assign_role(member_user, 'Member')

    response = member_client.get('/api/quizzes/')

    assert response.status_code == 404


def test_member_cannot_create_quiz(member_client, member_user):
    _assign_role(member_user, 'Member')

    response = member_client.post(
        '/api/quiz/quizzes/',
        {
            'title': 'Unauthorized Quiz',
            'description': 'Member should not create this',
            'status': Quiz.Status.DRAFT,
        },
        format='json',
    )

    assert response.status_code == 403


def test_editor_can_create_quiz(editor_client, editor_user):
    _assign_role(editor_user, 'Editor')

    response = editor_client.post(
        '/api/quiz/quizzes/',
        {
            'title': 'Editor Quiz',
            'description': 'Quiz by editor',
            'status': Quiz.Status.DRAFT,
        },
        format='json',
    )

    assert response.status_code == 201
    assert response.data['title'] == 'Editor Quiz'


def test_quiz_point_is_read_only_derived(editor_client, editor_user):
    """quiz_point is derived from question scores; a client-supplied value is
    ignored (read-only) rather than persisted."""
    _assign_role(editor_user, 'Editor')

    response = editor_client.post(
        '/api/quiz/quizzes/',
        {
            'title': 'Derived Point Quiz',
            'status': Quiz.Status.DRAFT,
            'quiz_point': 999,
        },
        format='json',
    )

    assert response.status_code == 201
    # No questions yet -> derived point is 0, not the supplied 999.
    assert response.data['quiz_point'] == 0


def test_member_can_read_quiz_progress(member_client, member_user, published_quiz):
    _assign_role(member_user, 'Member')

    UserQuizProgress.objects.create(
        user=member_user,
        quiz=published_quiz,
        best_score=77,
        attempt_count=2,
    )

    response = member_client.get(f'/api/quiz/quizzes/{published_quiz.id}/progress/')

    assert response.status_code == 200
    assert response.data['quiz_id'] == published_quiz.id
    assert response.data['best_score'] == 77
    assert response.data['attempt_count'] == 2


def test_member_quiz_progress_defaults_when_missing(member_client, member_user, published_quiz):
    _assign_role(member_user, 'Member')

    response = member_client.get(f'/api/quiz/quizzes/{published_quiz.id}/progress/')

    assert response.status_code == 200
    assert response.data['quiz_id'] == published_quiz.id
    assert response.data['best_score'] == 0
    assert response.data['attempt_count'] == 0


def test_quiz_detail_includes_category(member_client, member_user):
    _assign_role(member_user, 'Member')
    category = QuizCategory.objects.create(name='Web Security')
    quiz = Quiz.objects.create(
        title='Category Quiz',
        status=Quiz.Status.PUBLISHED,
        category=category,
    )

    response = member_client.get(f'/api/quiz/quizzes/{quiz.id}/')

    assert response.status_code == 200
    assert response.data['category']['id'] == category.id
    assert response.data['category']['name'] == category.name


def test_editor_can_create_question_and_sync_total_questions(editor_client, editor_user, published_quiz):
    _assign_role(editor_user, 'Editor')

    response = editor_client.post(
        f'/api/quiz/quizzes/{published_quiz.id}/questions/',
        {
            'question_type': QuizQuestion.QuestionType.SINGLE_CHOICE,
            'content': {'text': 'What is XSS?'},
            'score': 1,
            'position': 1,
            'options': [
                {'content': 'Cross Site Scripting', 'position': 1, 'is_correct': True},
                {'content': 'Cross Server Script', 'position': 2, 'is_correct': False},
            ],
        },
        format='json',
    )

    assert response.status_code == 201
    published_quiz.refresh_from_db()
    assert published_quiz.total_questions == 1


def test_fill_blank_requires_answers(editor_client, editor_user, published_quiz):
    _assign_role(editor_user, 'Editor')

    response = editor_client.post(
        f'/api/quiz/quizzes/{published_quiz.id}/questions/',
        {
            'question_type': QuizQuestion.QuestionType.FILL_BLANK,
            'content': {'text': 'Command to list files is ___'},
            'score': 1,
            'position': 1,
            'answers': [],
        },
        format='json',
    )

    assert response.status_code == 400
    assert 'answers' in response.data


def test_member_can_get_and_update_own_quiz_config(member_client, member_user, published_quiz):
    _assign_role(member_user, 'Member')

    get_response = member_client.get(f'/api/quiz/quizzes/{published_quiz.id}/config/')
    assert get_response.status_code == 200
    assert get_response.data['total_questions'] is None
    assert get_response.data['time_limit_sec'] is None
    assert get_response.data['random_question'] is False
    assert get_response.data['random_option'] is False

    put_response = member_client.put(
        f'/api/quiz/quizzes/{published_quiz.id}/config/',
        {
            'total_questions': 5,
            'time_limit_sec': 300,
            'random_question': True,
            'random_option': False,
            'allow_review': True,
            'allow_retry': True,
            'max_attempt': 3,
            'is_active': True,
        },
        format='json',
    )

    assert put_response.status_code == 200
    assert put_response.data['total_questions'] == 5
    assert put_response.data['user'] == member_user.id


def test_editor_can_create_and_list_quiz_root_nodes(editor_client, editor_user):
    _assign_role(editor_user, 'Editor')

    create_response = editor_client.post(
        '/api/quiz/nodes/',
        {
            'title': 'Quiz Root Folder',
            'position': 1,
        },
        format='json',
    )

    assert create_response.status_code == 201
    assert create_response.data['title'] == 'Quiz Root Folder'
    assert create_response.data['is_item'] is False
    assert create_response.data['path'] == ''

    list_response = editor_client.get('/api/quiz/nodes/')
    assert list_response.status_code == 200
    assert list_response.data['count'] == 1
    assert list_response.data['results'][0]['id'] == create_response.data['id']


def test_editor_can_create_child_and_load_children(editor_client, editor_user):
    _assign_role(editor_user, 'Editor')

    parent = QuizNode.objects.create(title='Parent', position=1)

    create_child = editor_client.post(
        '/api/quiz/nodes/',
        {
            'title': 'Child',
            'parent_id': parent.id,
        },
        format='json',
    )

    assert create_child.status_code == 201
    assert create_child.data['path'] == str(parent.id)

    children_response = editor_client.get(f'/api/quiz/nodes/{parent.id}/children/')
    assert children_response.status_code == 200
    assert len(children_response.data) == 1
    assert children_response.data[0]['id'] == create_child.data['id']


def test_member_cannot_create_quiz_node(member_client, member_user):
    _assign_role(member_user, 'Member')

    response = member_client.post(
        '/api/quiz/nodes/',
        {
            'title': 'Should Fail',
            'position': 1,
        },
        format='json',
    )

    assert response.status_code == 403


def test_move_quiz_node_prevents_cycle(editor_client, editor_user):
    _assign_role(editor_user, 'Editor')

    root = QuizNode.objects.create(title='Root', position=1)
    child = QuizNode.objects.create(title='Child', parent=root, position=1)

    response = editor_client.post(
        f'/api/quiz/nodes/{root.id}/move/',
        {'parent_id': child.id},
        format='json',
    )

    assert response.status_code == 400
    assert 'cycle' in str(response.data).lower()


def test_delete_quiz_node_deletes_subtree(editor_client, editor_user):
    _assign_role(editor_user, 'Editor')

    root = QuizNode.objects.create(title='Root', position=1)
    QuizNode.objects.create(title='Child', parent=root, position=1)

    response = editor_client.delete(f'/api/quiz/nodes/{root.id}/')

    assert response.status_code == 204
    assert QuizNode.objects.count() == 0


def test_editor_can_create_quiz_item_node_atomically(editor_client, editor_user):
    _assign_role(editor_user, 'Editor')

    response = editor_client.post(
        '/api/quiz/nodes/',
        {'title': 'My Quiz', 'is_item': True},
        format='json',
    )

    assert response.status_code == 201
    assert response.data['is_item'] is True
    quiz_id = response.data['quiz']
    assert quiz_id is not None
    quiz = Quiz.objects.get(id=quiz_id)
    assert quiz.status == Quiz.Status.DRAFT
    assert quiz.title == 'My Quiz'


def test_explorer_root_returns_folders_first_then_items(editor_client, editor_user):
    _assign_role(editor_user, 'Editor')

    QuizNode.objects.create(title='Zeta Folder', is_item=False, position=1)
    quiz = Quiz.objects.create(title='Alpha Quiz', status=Quiz.Status.PUBLISHED)
    QuizNode.objects.create(title='Alpha Quiz', is_item=True, quiz=quiz, position=2)

    response = editor_client.get('/api/quiz/nodes/explorer/')

    assert response.status_code == 200
    nodes = response.data['nodes']
    assert len(nodes) == 2
    # Folder sorts before item regardless of title.
    assert nodes[0]['is_item'] is False
    assert nodes[1]['is_item'] is True
    assert nodes[1]['quiz']['title'] == 'Alpha Quiz'


def test_explorer_member_sees_published_items_only(member_client, member_user):
    _assign_role(member_user, 'Member')

    pub = Quiz.objects.create(title='Pub', status=Quiz.Status.PUBLISHED)
    draft = Quiz.objects.create(title='Draft', status=Quiz.Status.DRAFT)
    QuizNode.objects.create(title='Pub', is_item=True, quiz=pub, position=1)
    QuizNode.objects.create(title='Draft', is_item=True, quiz=draft, position=2)

    response = member_client.get('/api/quiz/nodes/explorer/')

    assert response.status_code == 200
    titles = [n['title'] for n in response.data['nodes']]
    assert titles == ['Pub']


def test_explorer_folder_returns_breadcrumb(editor_client, editor_user):
    _assign_role(editor_user, 'Editor')

    root = QuizNode.objects.create(title='Root', is_item=False, position=1)
    root.rebuild_path()
    child = QuizNode.objects.create(title='Child', is_item=False, parent=root, position=1)
    child.rebuild_path()

    response = editor_client.get(f'/api/quiz/nodes/{child.id}/explorer/')

    assert response.status_code == 200
    crumbs = [c['title'] for c in response.data['breadcrumb']]
    assert crumbs == ['Root', 'Child']


def test_editor_can_crud_quiz_category(editor_client, editor_user):
    _assign_role(editor_user, 'Editor')

    create = editor_client.post('/api/quiz/categories/', {'name': 'Security'}, format='json')
    assert create.status_code == 201
    cat_id = create.data['id']

    listed = editor_client.get('/api/quiz/categories/')
    assert listed.status_code == 200

    delete = editor_client.delete(f'/api/quiz/categories/{cat_id}/')
    assert delete.status_code == 204


def test_editor_can_assign_category_and_tags_to_quiz(editor_client, editor_user):
    _assign_role(editor_user, 'Editor')

    category = QuizCategory.objects.create(name='Net')
    tag1 = editor_client.post('/api/quiz/tags/', {'name': 'Easy'}, format='json').data['id']
    tag2 = editor_client.post('/api/quiz/tags/', {'name': 'Logic'}, format='json').data['id']
    quiz = Quiz.objects.create(title='Editable', status=Quiz.Status.DRAFT)

    response = editor_client.patch(
        f'/api/quiz/quizzes/{quiz.id}/',
        {'category_id': category.id, 'tag_ids': [tag1, tag2]},
        format='json',
    )

    assert response.status_code == 200
    assert response.data['category']['id'] == category.id
    tag_names = sorted(t['name'] for t in response.data['tags'])
    assert tag_names == ['Easy', 'Logic']


def test_flat_search_filters_quiz_by_tag(member_client, member_user):
    _assign_role(member_user, 'Member')

    from api.models import QuizTag, QuizTagMap

    tag = QuizTag.objects.create(name='Crypto')
    tagged = Quiz.objects.create(title='Tagged', status=Quiz.Status.PUBLISHED)
    QuizTagMap.objects.create(quiz=tagged, tag=tag)
    Quiz.objects.create(title='Untagged', status=Quiz.Status.PUBLISHED)

    response = member_client.get(f'/api/quiz/quizzes/?tags={tag.id}')

    assert response.status_code == 200
    titles = [q['title'] for q in response.data['results']]
    assert titles == ['Tagged']
