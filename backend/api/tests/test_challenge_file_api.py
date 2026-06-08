"""Tests for challenge attachment files (Task 6.8 Phase 1).

Covers the upload → list → download happy path, download gating for
draft/unauthorized requesters, and delete (row + media). MEDIA_ROOT is pointed
at a per-test tmp dir so no real files leak between runs.
"""

import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from api.models import Challenge, ChallengeCategory, ChallengeFile, Role, UserRole
from api.services.challenge_service import ChallengeService

pytestmark = pytest.mark.integration


def _assign_role(user, role_name):
    role, _ = Role.objects.get_or_create(name=role_name, defaults={'is_system': True})
    UserRole.objects.get_or_create(user=user, role=role)


def _files_url(slug):
    return f'/api/challenge/challenges/{slug}/files/'


def _file_detail_url(slug, file_id):
    return f'/api/challenge/challenges/{slug}/files/{file_id}/'


def _download_url(slug, file_id):
    return f'/api/challenge/challenges/{slug}/files/{file_id}/download/'


@pytest.fixture(autouse=True)
def _media_root(tmp_path, settings):
    settings.MEDIA_ROOT = str(tmp_path / 'media')


@pytest.fixture
def category(db):
    return ChallengeCategory.objects.create(name='Web')


@pytest.fixture
def published_challenge(db, category):
    return Challenge.objects.create(
        slug='file-test-challenge',
        title='File Test Challenge',
        status=Challenge.Status.PUBLISHED,
        difficulty=Challenge.Difficulty.EASY,
        category=category,
        storage_path='challenges/file-test',
    )


@pytest.fixture
def draft_challenge(db, category):
    return Challenge.objects.create(
        slug='draft-file-challenge',
        title='Draft File Challenge',
        status=Challenge.Status.DRAFT,
        category=category,
        storage_path='challenges/draft-file',
    )


def _upload(content=b'attachment-bytes', name='attachment.zip'):
    return SimpleUploadedFile(name, content, content_type='application/zip')


# ---------------------------------------------------------------------------
# Upload → list → download happy path
# ---------------------------------------------------------------------------

def test_editor_upload_then_list(editor_client, editor_user, published_challenge):
    _assign_role(editor_user, 'Editor')

    resp = editor_client.post(
        _files_url(published_challenge.slug),
        {'file': _upload()},
        format='multipart',
    )
    assert resp.status_code == 201
    assert resp.data['filename'] == 'attachment.zip'
    assert resp.data['source'] == 'upload'
    assert resp.data['size'] == len(b'attachment-bytes')

    list_resp = editor_client.get(_files_url(published_challenge.slug))
    assert list_resp.status_code == 200
    assert len(list_resp.data) == 1
    # storage_key / media path are never exposed.
    assert 'storage_key' not in list_resp.data[0]


def test_member_can_download_published_file(member_client, member_user, editor_client, editor_user, published_challenge):
    _assign_role(editor_user, 'Editor')
    _assign_role(member_user, 'Member')

    upload = editor_client.post(
        _files_url(published_challenge.slug), {'file': _upload(b'hello-world')}, format='multipart'
    )
    file_id = upload.data['id']

    resp = member_client.get(_download_url(published_challenge.slug, file_id))
    assert resp.status_code == 200
    body = b''.join(resp.streaming_content)
    assert body == b'hello-world'


# ---------------------------------------------------------------------------
# Download gating
# ---------------------------------------------------------------------------

def test_member_cannot_download_draft_file(member_client, member_user, editor_user, draft_challenge):
    _assign_role(editor_user, 'Editor')
    _assign_role(member_user, 'Member')

    cf = ChallengeService.store_bytes(
        draft_challenge, 'secret.txt', b'top-secret', source=ChallengeFile.Source.UPLOAD, actor=editor_user
    )

    resp = member_client.get(_download_url(draft_challenge.slug, cf.id))
    assert resp.status_code == 404


def test_editor_can_download_draft_file(editor_client, editor_user, draft_challenge):
    _assign_role(editor_user, 'Editor')

    cf = ChallengeService.store_bytes(
        draft_challenge, 'notes.txt', b'draft-notes', source=ChallengeFile.Source.UPLOAD, actor=editor_user
    )

    resp = editor_client.get(_download_url(draft_challenge.slug, cf.id))
    assert resp.status_code == 200
    assert b''.join(resp.streaming_content) == b'draft-notes'


def test_member_cannot_upload(member_client, member_user, published_challenge):
    _assign_role(member_user, 'Member')

    resp = member_client.post(
        _files_url(published_challenge.slug), {'file': _upload()}, format='multipart'
    )
    assert resp.status_code == 403


def test_member_can_list_files_of_published_challenge(member_client, member_user, published_challenge):
    """Members must be able to LIST attachments of a published challenge so they
    can discover what to download (parity with file_download). Upload stays 403
    (see test_member_cannot_upload)."""
    _assign_role(member_user, 'Member')
    ChallengeService.store_bytes(
        published_challenge, 'handout.pdf', b'bytes', source=ChallengeFile.Source.UPLOAD, actor=member_user
    )
    resp = member_client.get(_files_url(published_challenge.slug))
    assert resp.status_code == 200
    assert any(f['filename'] == 'handout.pdf' for f in resp.data)


def test_member_cannot_list_files_of_draft_challenge(member_client, member_user, draft_challenge):
    """A draft challenge is invisible to Members, so listing its files 404s."""
    _assign_role(member_user, 'Member')
    assert member_client.get(_files_url(draft_challenge.slug)).status_code == 404


# ---------------------------------------------------------------------------
# Delete removes row + media
# ---------------------------------------------------------------------------

def test_delete_removes_row_and_media(editor_client, editor_user, published_challenge):
    import os

    _assign_role(editor_user, 'Editor')
    cf = ChallengeService.store_bytes(
        published_challenge, 'doomed.bin', b'bytes', source=ChallengeFile.Source.UPLOAD, actor=editor_user
    )
    abs_path = ChallengeService._absolute_media_path(cf.storage_key)
    assert os.path.isfile(abs_path)

    resp = editor_client.delete(_file_detail_url(published_challenge.slug, cf.id))
    assert resp.status_code == 204
    assert not ChallengeFile.objects.filter(id=cf.id).exists()
    assert not os.path.isfile(abs_path)


def test_upload_missing_file_returns_400(editor_client, editor_user, published_challenge):
    _assign_role(editor_user, 'Editor')
    resp = editor_client.post(_files_url(published_challenge.slug), {}, format='multipart')
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Service-level: path traversal is neutralized
# ---------------------------------------------------------------------------

def test_store_bytes_strips_path_traversal(db, editor_user, published_challenge):
    cf = ChallengeService.store_bytes(
        published_challenge,
        '../../etc/passwd',
        b'x',
        source=ChallengeFile.Source.UPLOAD,
        actor=editor_user,
    )
    assert '..' not in cf.storage_key
    assert cf.storage_key == f'challenges/{published_challenge.slug}/passwd'
