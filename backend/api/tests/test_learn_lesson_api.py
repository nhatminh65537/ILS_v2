import pytest
from rest_framework.test import APIClient

from api.models import Course, CourseCategory, CourseNode, Lesson, Quiz, QuizQuestion, Role, UserRole


pytestmark = pytest.mark.integration


def _assign_role(user, role_name):
    role, _ = Role.objects.get_or_create(name=role_name, defaults={'is_system': True})
    UserRole.objects.get_or_create(user=user, role=role)


def _jwt_client(user):
    """APIClient carrying a real JWT (authorization is bitmap-driven)."""
    from auth_app.services.token_service import TokenService

    tokens = TokenService().issue_tokens_for_new_session(user, device_info='pytest')
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    return client


@pytest.fixture
def published_course(db):
    category = CourseCategory.objects.create(name='Lesson Published Category')
    return Course.objects.create(
        slug='lesson-published-course',
        title='Lesson Published Course',
        status=Course.Status.PUBLISHED,
        category=category,
    )


@pytest.fixture
def draft_course(db):
    category = CourseCategory.objects.create(name='Lesson Draft Category')
    return Course.objects.create(
        slug='lesson-draft-course',
        title='Lesson Draft Course',
        status=Course.Status.DRAFT,
        category=category,
    )


def _create_lesson_node(course, lesson, title='Lesson Node', position=1):
    return CourseNode.objects.create(
        course=course,
        lesson=lesson,
        is_item=True,
        title=title,
        position=position,
    )


def _create_question():
    quiz = Quiz.objects.create(title='Miniquiz Container')
    return QuizQuestion.objects.create(
        quiz=quiz,
        question_type=QuizQuestion.QuestionType.SINGLE_CHOICE,
        content={'text': 'What is 2+2?'},
        position=1,
    )


def test_member_can_get_published_lesson_detail(member_client, member_user, published_course):
    _assign_role(member_user, 'Member')
    lesson = Lesson.objects.create(
        title='Lesson A',
        lesson_type=Lesson.LessonType.MARKDOWN,
        content_md='hello',
    )
    _create_lesson_node(published_course, lesson)

    response = member_client.get(f'/api/learn/lessons/{lesson.id}/')

    assert response.status_code == 200
    assert response.data['id'] == lesson.id
    assert response.data['title'] == 'Lesson A'


def test_member_cannot_get_draft_lesson_detail(member_client, member_user, draft_course):
    _assign_role(member_user, 'Member')
    lesson = Lesson.objects.create(
        title='Lesson Draft',
        lesson_type=Lesson.LessonType.MARKDOWN,
        content_md='draft',
    )
    _create_lesson_node(draft_course, lesson)

    response = member_client.get(f'/api/learn/lessons/{lesson.id}/')

    assert response.status_code == 404


def test_editor_can_update_lesson(editor_client, editor_user, draft_course):
    _assign_role(editor_user, 'Editor')
    lesson = Lesson.objects.create(
        title='Old',
        lesson_type=Lesson.LessonType.MARKDOWN,
        content_md='content',
    )
    _create_lesson_node(draft_course, lesson)

    response = editor_client.put(
        f'/api/learn/lessons/{lesson.id}/',
        {'title': 'New Title'},
        format='json',
    )

    assert response.status_code == 200
    assert response.data['title'] == 'New Title'


def test_member_cannot_update_lesson(member_client, member_user, published_course):
    _assign_role(member_user, 'Member')
    lesson = Lesson.objects.create(
        title='Immutable',
        lesson_type=Lesson.LessonType.MARKDOWN,
        content_md='content',
    )
    _create_lesson_node(published_course, lesson)

    response = member_client.put(
        f'/api/learn/lessons/{lesson.id}/',
        {'title': 'Nope'},
        format='json',
    )

    assert response.status_code == 403


def test_questions_list_requires_miniquiz(member_client, member_user, published_course):
    _assign_role(member_user, 'Member')
    lesson = Lesson.objects.create(
        title='Not a quiz',
        lesson_type=Lesson.LessonType.MARKDOWN,
        content_md='content',
    )
    _create_lesson_node(published_course, lesson)

    response = member_client.get(f'/api/learn/lessons/{lesson.id}/questions/')

    assert response.status_code == 400
    assert 'miniquiz' in response.data['detail'].lower()


def test_member_cannot_attach_question_to_miniquiz(member_client, member_user, published_course):
    _assign_role(member_user, 'Member')
    lesson = Lesson.objects.create(
        title='Miniquiz',
        lesson_type=Lesson.LessonType.MINIQUIZ,
    )
    _create_lesson_node(published_course, lesson)

    question = _create_question()

    response = member_client.post(
        f'/api/learn/lessons/{lesson.id}/questions/',
        {'question_id': question.id},
        format='json',
    )

    assert response.status_code == 403


def test_editor_can_attach_question_and_list(editor_client, editor_user, draft_course):
    _assign_role(editor_user, 'Editor')
    lesson = Lesson.objects.create(
        title='Miniquiz',
        lesson_type=Lesson.LessonType.MINIQUIZ,
    )
    _create_lesson_node(draft_course, lesson)

    question = _create_question()

    attach_response = editor_client.post(
        f'/api/learn/lessons/{lesson.id}/questions/',
        {'question_id': question.id},
        format='json',
    )

    assert attach_response.status_code == 201
    assert attach_response.data['lesson'] == lesson.id
    assert attach_response.data['question']['id'] == question.id
    assert attach_response.data['position'] == 0

    list_response = editor_client.get(f'/api/learn/lessons/{lesson.id}/questions/')
    assert list_response.status_code == 200
    assert len(list_response.data) == 1


def test_attach_duplicate_returns_409(editor_client, editor_user, draft_course):
    _assign_role(editor_user, 'Editor')
    lesson = Lesson.objects.create(
        title='Miniquiz',
        lesson_type=Lesson.LessonType.MINIQUIZ,
    )
    _create_lesson_node(draft_course, lesson)

    question = _create_question()

    first = editor_client.post(
        f'/api/learn/lessons/{lesson.id}/questions/',
        {'question_id': question.id},
        format='json',
    )
    assert first.status_code == 201

    dup = editor_client.post(
        f'/api/learn/lessons/{lesson.id}/questions/',
        {'question_id': question.id},
        format='json',
    )

    assert dup.status_code == 409


def test_update_lesson_question_position(editor_client, editor_user, draft_course):
    _assign_role(editor_user, 'Editor')
    lesson = Lesson.objects.create(
        title='Miniquiz',
        lesson_type=Lesson.LessonType.MINIQUIZ,
    )
    _create_lesson_node(draft_course, lesson)

    question = _create_question()

    attach_response = editor_client.post(
        f'/api/learn/lessons/{lesson.id}/questions/',
        {'question_id': question.id},
        format='json',
    )
    mapping_id = attach_response.data['id']

    update_response = editor_client.put(
        f'/api/learn/lesson-questions/{mapping_id}/',
        {'position': 2},
        format='json',
    )

    assert update_response.status_code == 200
    assert update_response.data['position'] == 2


def test_member_can_retrieve_mapping_for_published_course(member_client, member_user, admin_user, published_course):
    _assign_role(member_user, 'Member')

    lesson = Lesson.objects.create(
        title='Miniquiz',
        lesson_type=Lesson.LessonType.MINIQUIZ,
    )
    _create_lesson_node(published_course, lesson)

    question = _create_question()

    # Create mapping with an elevated client
    _assign_role(admin_user, 'Admin')
    admin_client = _jwt_client(admin_user)

    attach_response = admin_client.post(
        f'/api/learn/lessons/{lesson.id}/questions/',
        {'question_id': question.id},
        format='json',
    )
    assert attach_response.status_code == 201

    mapping_id = attach_response.data['id']

    response = member_client.get(f'/api/learn/lesson-questions/{mapping_id}/')

    assert response.status_code == 200
    assert response.data['id'] == mapping_id


def test_member_cannot_retrieve_mapping_for_draft_course(member_client, member_user, admin_user, draft_course):
    _assign_role(member_user, 'Member')

    lesson = Lesson.objects.create(
        title='Miniquiz Draft',
        lesson_type=Lesson.LessonType.MINIQUIZ,
    )
    _create_lesson_node(draft_course, lesson)

    question = _create_question()

    _assign_role(admin_user, 'Admin')
    admin_client = _jwt_client(admin_user)

    attach_response = admin_client.post(
        f'/api/learn/lessons/{lesson.id}/questions/',
        {'question_id': question.id},
        format='json',
    )
    assert attach_response.status_code == 201

    mapping_id = attach_response.data['id']

    response = member_client.get(f'/api/learn/lesson-questions/{mapping_id}/')

    assert response.status_code == 404
