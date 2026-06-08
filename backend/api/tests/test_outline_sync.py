"""Tests for Outline content sync (Task 5.8).

The Outline HTTP transport (urllib + WAF User-Agent + JSON normalization) is
exercised against the live instance during development; here we mock
``OutlineService``'s public methods so the tests are hermetic and assert the
*integration contract*: DB state changes, source toggling, the 503-preserves-old-
content guarantee, permission gating, and exception → HTTP status mapping.
"""

from unittest.mock import patch

import pytest
from rest_framework.test import APIClient

from api.models import Course, CourseCategory, CourseNode, Lesson, LessonOutline, Role, UserRole
from api.services.outline_service import (
    OutlineConfigError,
    OutlineNotFoundError,
    OutlineUnavailableError,
)


pytestmark = pytest.mark.integration


SERVICE = 'api.services.lesson_service.OutlineService'
VIEW_SERVICE = 'api.views.courses.OutlineService'


def _assign_role(user, role_name):
    role, _ = Role.objects.get_or_create(name=role_name, defaults={'is_system': True})
    UserRole.objects.get_or_create(user=user, role=role)


def _jwt_client(user):
    from auth_app.services.token_service import TokenService

    tokens = TokenService().issue_tokens_for_new_session(user, device_info='pytest')
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
    return client


@pytest.fixture
def draft_course(db):
    category = CourseCategory.objects.create(name='Outline Draft Category')
    return Course.objects.create(
        slug='outline-draft-course',
        title='Outline Draft Course',
        status=Course.Status.DRAFT,
        category=category,
    )


def _make_lesson(course, *, content='original content', source=Lesson.Source.MANUAL):
    lesson = Lesson.objects.create(
        title='Lesson',
        lesson_type=Lesson.LessonType.MARKDOWN,
        source=source,
        content_md=content,
    )
    CourseNode.objects.create(
        course=course, lesson=lesson, is_item=True, title='Node', position=1
    )
    return lesson


def _doc(doc_id='doc-1', *, text='# Imported\nfrom outline', revision=7):
    return {
        'id': doc_id,
        'title': 'Imported Doc',
        'url': 'https://wiki.example.com/doc/imported-abc',
        'revision': revision,
        'updated_at': '2026-06-06T00:00:00.000Z',
        'collection_id': 'col-1',
        'text': text,
    }


# ── link ─────────────────────────────────────────────────────────────────────
def test_editor_can_link_outline_and_import_content(editor_client, editor_user, draft_course):
    _assign_role(editor_user, 'Editor')
    lesson = _make_lesson(draft_course)

    with patch(f'{SERVICE}.get_document', return_value=_doc(text='# New body')):
        response = editor_client.post(
            f'/api/learn/lessons/{lesson.id}/outline/',
            {'outline_doc_id': 'doc-1'},
            format='json',
        )

    assert response.status_code == 200
    assert response.data['source'] == Lesson.Source.OUTLINE
    assert response.data['content_md'] == '# New body'
    assert response.data['outline_info']['outline_doc_id'] == 'doc-1'
    assert response.data['outline_info']['revision'] == 7
    assert response.data['outline_info']['last_synced_at'] is not None

    lesson.refresh_from_db()
    assert lesson.source == Lesson.Source.OUTLINE
    assert lesson.content_md == '# New body'
    assert LessonOutline.objects.filter(lesson=lesson, outline_doc_id='doc-1').exists()


def test_member_cannot_link_outline(member_client, member_user, draft_course):
    _assign_role(member_user, 'Member')
    lesson = _make_lesson(draft_course)

    with patch(f'{SERVICE}.get_document', return_value=_doc()):
        response = member_client.post(
            f'/api/learn/lessons/{lesson.id}/outline/',
            {'outline_doc_id': 'doc-1'},
            format='json',
        )

    assert response.status_code == 403


def test_link_doc_already_linked_to_other_lesson_returns_409(editor_client, editor_user, draft_course):
    _assign_role(editor_user, 'Editor')
    other_lesson = _make_lesson(draft_course)
    LessonOutline.objects.create(
        lesson=other_lesson,
        outline_doc_id='doc-shared',
        outline_url='https://wiki.example.com/doc/x',
        revision=1,
    )
    target_lesson = _make_lesson(draft_course)

    with patch(f'{SERVICE}.get_document', return_value=_doc(doc_id='doc-shared')):
        response = editor_client.post(
            f'/api/learn/lessons/{target_lesson.id}/outline/',
            {'outline_doc_id': 'doc-shared'},
            format='json',
        )

    assert response.status_code == 409


def test_link_missing_doc_returns_404(editor_client, editor_user, draft_course):
    _assign_role(editor_user, 'Editor')
    lesson = _make_lesson(draft_course)

    with patch(f'{SERVICE}.get_document', side_effect=OutlineNotFoundError('gone')):
        response = editor_client.post(
            f'/api/learn/lessons/{lesson.id}/outline/',
            {'outline_doc_id': 'missing'},
            format='json',
        )

    assert response.status_code == 404
    lesson.refresh_from_db()
    assert lesson.source == Lesson.Source.MANUAL  # unchanged


def test_link_when_outline_disabled_returns_409(editor_client, editor_user, draft_course):
    _assign_role(editor_user, 'Editor')
    lesson = _make_lesson(draft_course)

    with patch(f'{SERVICE}.get_document', side_effect=OutlineConfigError('disabled')):
        response = editor_client.post(
            f'/api/learn/lessons/{lesson.id}/outline/',
            {'outline_doc_id': 'doc-1'},
            format='json',
        )

    assert response.status_code == 409


# ── sync ─────────────────────────────────────────────────────────────────────
def test_sync_updates_content_and_revision(editor_client, editor_user, draft_course):
    _assign_role(editor_user, 'Editor')
    lesson = _make_lesson(draft_course, content='stale', source=Lesson.Source.OUTLINE)
    LessonOutline.objects.create(
        lesson=lesson,
        outline_doc_id='doc-1',
        outline_url='https://wiki.example.com/doc/x',
        revision=1,
    )

    with patch(f'{SERVICE}.get_document', return_value=_doc(text='fresh body', revision=9)):
        response = editor_client.post(f'/api/learn/lessons/{lesson.id}/sync-outline/')

    assert response.status_code == 200
    assert response.data['content_md'] == 'fresh body'
    assert response.data['outline_info']['revision'] == 9
    lesson.refresh_from_db()
    assert lesson.content_md == 'fresh body'


def test_sync_failure_returns_503_and_preserves_content(editor_client, editor_user, draft_course):
    _assign_role(editor_user, 'Editor')
    lesson = _make_lesson(draft_course, content='do-not-lose-me', source=Lesson.Source.OUTLINE)
    LessonOutline.objects.create(
        lesson=lesson,
        outline_doc_id='doc-1',
        outline_url='https://wiki.example.com/doc/x',
        revision=4,
    )

    with patch(f'{SERVICE}.get_document', side_effect=OutlineUnavailableError('down')):
        response = editor_client.post(f'/api/learn/lessons/{lesson.id}/sync-outline/')

    assert response.status_code == 503
    lesson.refresh_from_db()
    # Old content + revision intact — nothing was written.
    assert lesson.content_md == 'do-not-lose-me'
    assert LessonOutline.objects.get(lesson=lesson).revision == 4


def test_sync_when_not_linked_returns_400(editor_client, editor_user, draft_course):
    _assign_role(editor_user, 'Editor')
    lesson = _make_lesson(draft_course)

    response = editor_client.post(f'/api/learn/lessons/{lesson.id}/sync-outline/')

    assert response.status_code == 400


# ── unlink ───────────────────────────────────────────────────────────────────
def test_unlink_resets_source_and_keeps_content(editor_client, editor_user, draft_course):
    _assign_role(editor_user, 'Editor')
    lesson = _make_lesson(draft_course, content='kept body', source=Lesson.Source.OUTLINE)
    LessonOutline.objects.create(
        lesson=lesson,
        outline_doc_id='doc-1',
        outline_url='https://wiki.example.com/doc/x',
        revision=2,
    )

    response = editor_client.delete(f'/api/learn/lessons/{lesson.id}/outline/')

    assert response.status_code == 200
    assert response.data['source'] == Lesson.Source.MANUAL
    assert response.data['outline_info'] is None
    lesson.refresh_from_db()
    assert lesson.content_md == 'kept body'
    assert not LessonOutline.objects.filter(lesson=lesson).exists()


# ── browse (collections / documents) ─────────────────────────────────────────
def test_editor_can_list_outline_collections(editor_client, editor_user, db):
    _assign_role(editor_user, 'Editor')
    payload = {'items': [{'id': 'c1', 'name': 'Training'}], 'total': 1, 'offset': 0, 'limit': 25}

    with patch(f'{VIEW_SERVICE}.list_collections', return_value=payload) as mock:
        response = editor_client.get('/api/learn/outline/collections/?limit=25')

    assert response.status_code == 200
    assert response.data['items'][0]['name'] == 'Training'
    mock.assert_called_once_with(offset=0, limit=25)


def test_editor_can_list_outline_documents_filtered_by_collection(editor_client, editor_user, db):
    _assign_role(editor_user, 'Editor')
    payload = {'items': [{'id': 'd1', 'title': 'Doc'}], 'total': 1, 'offset': 0, 'limit': 25}

    with patch(f'{VIEW_SERVICE}.list_documents', return_value=payload) as mock:
        response = editor_client.get('/api/learn/outline/documents/?collection_id=c1')

    assert response.status_code == 200
    assert response.data['items'][0]['title'] == 'Doc'
    mock.assert_called_once_with(collection_id='c1', offset=0, limit=25)


def test_collections_when_disabled_returns_409(editor_client, editor_user, db):
    _assign_role(editor_user, 'Editor')

    with patch(f'{VIEW_SERVICE}.list_collections', side_effect=OutlineConfigError('disabled')):
        response = editor_client.get('/api/learn/outline/collections/')

    assert response.status_code == 409


def test_member_cannot_browse_outline(member_client, member_user, db):
    _assign_role(member_user, 'Member')

    response = member_client.get('/api/learn/outline/collections/')

    assert response.status_code == 403


# ── attachment (image) URL rewrite ────────────────────────────────────────────
def test_rewrite_attachment_urls_relative_and_absolute():
    """Both relative and absolute Outline attachment URLs are rewritten to the
    lesson-scoped ILS proxy; non-attachment links are left untouched."""
    from api.services.outline_service import OutlineService

    text = (
        '# Title\n'
        '![rel](/api/attachments.redirect?id=11111111-1111-1111-1111-111111111111)\n'
        '![abs](https://wiki.example.com/api/attachments.redirect?id=22222222-2222-2222-2222-222222222222)\n'
        '[doc link](https://wiki.example.com/doc/keep-me)\n'
    )
    out = OutlineService.rewrite_attachment_urls(text, lesson_id=42)

    assert '/api/learn/lessons/42/outline-attachment/?id=11111111-1111-1111-1111-111111111111' in out
    assert '/api/learn/lessons/42/outline-attachment/?id=22222222-2222-2222-2222-222222222222' in out
    # The original Outline attachment URLs must be gone.
    assert 'attachments.redirect' not in out
    # Non-attachment links are preserved.
    assert 'https://wiki.example.com/doc/keep-me' in out


def test_link_outline_rewrites_image_urls(editor_client, editor_user, draft_course):
    """Importing a doc whose markdown has an Outline image rewrites that image
    URL to the ILS proxy so the browser can load it without the Outline token."""
    _assign_role(editor_user, 'Editor')
    lesson = _make_lesson(draft_course)
    body = '![pic](/api/attachments.redirect?id=33333333-3333-3333-3333-333333333333)'

    with patch(f'{SERVICE}.get_document', return_value=_doc(text=body)):
        response = editor_client.post(
            f'/api/learn/lessons/{lesson.id}/outline/',
            {'outline_doc_id': 'doc-1'},
            format='json',
        )

    assert response.status_code == 200
    lesson.refresh_from_db()
    assert f'/api/learn/lessons/{lesson.id}/outline-attachment/?id=33333333-3333-3333-3333-333333333333' in lesson.content_md
    assert 'attachments.redirect' not in lesson.content_md
