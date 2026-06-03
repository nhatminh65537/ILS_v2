from django.utils import timezone
import pytest
from rest_framework.test import APIClient

from api.models import Course, CourseCategory, CourseNode, CourseTag, Lesson, Role, UserLessonProgress, UserRole


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


def _extract_results(response):
    data = response.data
    if isinstance(data, dict) and 'results' in data:
        return data['results']
    return data


@pytest.fixture
def published_course(db):
    category = CourseCategory.objects.create(name='Published Category')
    return Course.objects.create(
        slug='published-course',
        title='Published Course',
        status=Course.Status.PUBLISHED,
        category=category,
    )


@pytest.fixture
def draft_course(db):
    category = CourseCategory.objects.create(name='Draft Category')
    return Course.objects.create(
        slug='draft-course',
        title='Draft Course',
        status=Course.Status.DRAFT,
        category=category,
    )


def test_member_list_learn_courses_shows_only_published(member_client, member_user, published_course, draft_course):
    _assign_role(member_user, 'Member')

    response = member_client.get('/api/learn/courses/')

    assert response.status_code == 200
    results = _extract_results(response)
    assert len(results) == 1
    assert results[0]['slug'] == published_course.slug


def test_member_status_filter_cannot_expose_draft(member_client, member_user, published_course, draft_course):
    _assign_role(member_user, 'Member')

    # A member has no draft-read permission, so explicitly requesting the draft
    # status must return nothing rather than leaking drafts (or silently
    # downgrading to published).
    response = member_client.get('/api/learn/courses/?status=draft')

    assert response.status_code == 200
    results = _extract_results(response)
    assert len(results) == 0


def test_member_default_list_shows_only_published(member_client, member_user, published_course, draft_course):
    _assign_role(member_user, 'Member')

    response = member_client.get('/api/learn/courses/')

    assert response.status_code == 200
    results = _extract_results(response)
    assert len(results) == 1
    assert results[0]['slug'] == published_course.slug


def test_tag_filter_uses_and_semantics(member_client, member_user, db):
    from api.models import CourseTagMap

    _assign_role(member_user, 'Member')

    category = CourseCategory.objects.create(name='Tagged Category')
    tag_web = CourseTag.objects.create(name='web')
    tag_crypto = CourseTag.objects.create(name='crypto')

    course_both = Course.objects.create(
        slug='both-tags', title='Both', status=Course.Status.PUBLISHED, category=category,
    )
    course_web_only = Course.objects.create(
        slug='web-only', title='Web Only', status=Course.Status.PUBLISHED, category=category,
    )
    CourseTagMap.objects.create(course=course_both, tag=tag_web)
    CourseTagMap.objects.create(course=course_both, tag=tag_crypto)
    CourseTagMap.objects.create(course=course_web_only, tag=tag_web)

    # Single tag -> both courses carry 'web'
    response = member_client.get(f'/api/learn/courses/?tags={tag_web.id}')
    slugs = {c['slug'] for c in _extract_results(response)}
    assert slugs == {'both-tags', 'web-only'}

    # AND of two tags -> only the course carrying both
    response = member_client.get(f'/api/learn/courses/?tags={tag_web.id},{tag_crypto.id}')
    slugs = {c['slug'] for c in _extract_results(response)}
    assert slugs == {'both-tags'}


def test_limit_offset_pagination(member_client, member_user, db):
    _assign_role(member_user, 'Member')
    category = CourseCategory.objects.create(name='Paging Category')
    for i in range(3):
        Course.objects.create(
            slug=f'paging-{i}', title=f'Paging {i}',
            status=Course.Status.PUBLISHED, category=category,
        )

    response = member_client.get('/api/learn/courses/?limit=2&offset=0')
    assert response.status_code == 200
    assert response.data['count'] == 3
    assert len(response.data['results']) == 2
    assert response.data['next'] is not None


def test_editor_can_create_learn_course(editor_client, editor_user):
    _assign_role(editor_user, 'Editor')
    category = CourseCategory.objects.create(name='Create Category')
    tag = CourseTag.objects.create(name='web')

    response = editor_client.post(
        '/api/learn/courses/',
        {
            'slug': 'owasp-basics',
            'title': 'OWASP Basics',
            'description': 'Intro security curriculum',
            'status': Course.Status.DRAFT,
            'category_id': category.id,
            'tag_ids': [tag.id],
            'estimated_time': 90,
            'learning_point': 30,
        },
        format='json',
    )

    assert response.status_code == 201
    assert response.data['slug'] == 'owasp-basics'
    assert response.data['category']['id'] == category.id
    assert len(response.data['tags']) == 1
    assert response.data['tags'][0]['id'] == tag.id


def test_create_course_slug_conflict_returns_409_with_suggestions(editor_client, editor_user):
    _assign_role(editor_user, 'Editor')
    Course.objects.create(slug='network-fundamentals', title='Existing Course')

    response = editor_client.post(
        '/api/learn/courses/',
        {
            'slug': 'network-fundamentals',
            'title': 'Duplicate Slug Course',
            'status': Course.Status.DRAFT,
        },
        format='json',
    )

    assert response.status_code == 409
    assert response.data['slug'] == 'network-fundamentals'
    assert isinstance(response.data['suggestions'], list)
    assert len(response.data['suggestions']) > 0


def test_course_list_includes_user_progress(member_client, member_user):
    _assign_role(member_user, 'Member')
    course = Course.objects.create(slug='progress-course', title='Progress Course', status=Course.Status.PUBLISHED)
    lesson = Lesson.objects.create(
        title='Lesson A',
        lesson_type=Lesson.LessonType.MARKDOWN,
        content_md='content',
    )
    CourseNode.objects.create(course=course, lesson=lesson, is_item=True, title='Lesson Node', position=1)
    UserLessonProgress.objects.create(
        user=member_user,
        lesson=lesson,
        started_at=timezone.now(),
        completed_at=timezone.now(),
    )

    response = member_client.get('/api/learn/courses/')

    assert response.status_code == 200
    results = _extract_results(response)
    assert results[0]['user_progress']['completed'] == 1
    assert results[0]['user_progress']['total'] == 1


def test_admin_can_manage_categories(admin_client):
    create_response = admin_client.post(
        '/api/learn/categories/',
        {'name': 'Web Security', 'description': 'Web track'},
        format='json',
    )

    assert create_response.status_code == 201
    category_id = create_response.data['id']

    update_response = admin_client.put(
        f'/api/learn/categories/{category_id}/',
        {'name': 'Web Security Updated', 'description': 'Web track updated'},
        format='json',
    )

    assert update_response.status_code == 200
    assert update_response.data['name'] == 'Web Security Updated'

    delete_response = admin_client.delete(f'/api/learn/categories/{category_id}/')
    assert delete_response.status_code == 204


def test_non_admin_cannot_write_categories(editor_client, editor_user, member_client):
    _assign_role(editor_user, 'Editor')

    editor_response = editor_client.post(
        '/api/learn/categories/',
        {'name': 'Editor Category'},
        format='json',
    )
    member_response = member_client.post(
        '/api/learn/categories/',
        {'name': 'Member Category'},
        format='json',
    )

    assert editor_response.status_code == 403
    assert member_response.status_code == 403


def test_tag_routes_permission_behavior(editor_user, member_user):
    _assign_role(editor_user, 'Editor')
    _assign_role(member_user, 'Member')

    editor_client = _jwt_client(editor_user)
    member_client = _jwt_client(member_user)

    editor_create = editor_client.post(
        '/api/learn/tags/',
        {'name': 'xss', 'description': 'XSS'},
        format='json',
    )

    assert editor_create.status_code == 201
    tag_id = editor_create.data['id']

    member_list = member_client.get('/api/learn/tags/')
    assert member_list.status_code == 200

    member_create = member_client.post('/api/learn/tags/', {'name': 'member-tag'}, format='json')
    member_update = member_client.put(
        f'/api/learn/tags/{tag_id}/',
        {'name': 'member-edit', 'description': 'forbidden'},
        format='json',
    )
    member_delete = member_client.delete(f'/api/learn/tags/{tag_id}/')

    assert member_create.status_code == 403
    assert member_update.status_code == 403
    assert member_delete.status_code == 403


def test_learn_detail_route_and_legacy_route_both_work(member_client, member_user):
    _assign_role(member_user, 'Member')
    course = Course.objects.create(slug='routing-course', title='Routing Course', status=Course.Status.PUBLISHED)

    learn_detail = member_client.get(f'/api/learn/courses/{course.slug}/')
    legacy_list = member_client.get('/api/courses/')

    assert learn_detail.status_code == 200
    assert learn_detail.data['slug'] == course.slug
    assert legacy_list.status_code == 200


def test_delete_course_archives_by_default_and_admin_can_purge(editor_user, admin_user):
    _assign_role(editor_user, 'Editor')
    _assign_role(admin_user, 'Admin')

    editor_client = _jwt_client(editor_user)
    admin_client = _jwt_client(admin_user)

    course = Course.objects.create(slug='delete-course', title='Delete Course', status=Course.Status.DRAFT)

    archive_response = editor_client.delete(f'/api/learn/courses/{course.slug}/')
    assert archive_response.status_code == 204

    course.refresh_from_db()
    assert course.status == Course.Status.ARCHIVED

    purge_forbidden = editor_client.delete(f'/api/learn/courses/{course.slug}/?mode=purge')
    assert purge_forbidden.status_code == 403
    assert Course.objects.filter(id=course.id).exists()

    purge_response = admin_client.delete(f'/api/learn/courses/{course.slug}/?mode=purge')
    assert purge_response.status_code == 204
    assert not Course.objects.filter(id=course.id).exists()
