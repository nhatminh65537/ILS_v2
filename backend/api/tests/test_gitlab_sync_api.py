"""Tests for GitLab import/sync (Task 6.8 Phase 2).

Two layers:
1. GitlabService transport — config validation + urllib failure mapping (mocking
   ``urlopen``), so the exception hierarchy is exercised without a live GitLab.
2. Integration contract — mocking ``GitlabService``'s public methods to assert DB
   state changes for import/sync, the 503-preserves-old-content guarantee, and
   exception → HTTP status mapping (AC-CHAL-06).
"""

from unittest.mock import MagicMock, patch
from urllib.error import HTTPError, URLError

import pytest

from api.models import (
    Challenge,
    ChallengeCategory,
    ChallengeFile,
    ChallengeGitlab,
    ChallengeNode,
    Role,
    SystemConfig,
    UserRole,
)
from api.services.challenge_service import ChallengeService
from api.services.gitlab_service import (
    GitlabConfigError,
    GitlabNotFoundError,
    GitlabService,
    GitlabUnavailableError,
)

pytestmark = pytest.mark.integration


# Patch targets: the service uses GitlabService directly; the view re-exports it.
SERVICE = 'api.services.challenge_service.GitlabService'


def _assign_role(user, role_name):
    role, _ = Role.objects.get_or_create(name=role_name, defaults={'is_system': True})
    UserRole.objects.get_or_create(user=user, role=role)


@pytest.fixture(autouse=True)
def _media_root(tmp_path, settings):
    settings.MEDIA_ROOT = str(tmp_path / 'media')


@pytest.fixture
def gitlab_config(db):
    SystemConfig.objects.update_or_create(
        key='challenge.git.enabled',
        defaults={
            'value': True,
            'value_type': SystemConfig.ConfigType.BOOL,
            'category': 'challenge',
            'is_runtime': True,
        },
    )
    SystemConfig.objects.update_or_create(
        key='challenge.git.url',
        defaults={
            'value': 'https://gitlab.example.com',
            'value_type': SystemConfig.ConfigType.STRING,
            'category': 'challenge',
            'is_runtime': True,
        },
    )
    SystemConfig.objects.update_or_create(
        key='challenge.git.token',
        defaults={
            'value': 'glpat-test-token',
            'value_type': SystemConfig.ConfigType.SECRET,
            'category': 'challenge',
            'is_runtime': True,
        },
    )


# ---------------------------------------------------------------------------
# GitlabService transport layer
# ---------------------------------------------------------------------------

def test_disabled_config_raises_config_error(db):
    SystemConfig.objects.update_or_create(
        key='challenge.git.enabled',
        defaults={'value': False, 'value_type': SystemConfig.ConfigType.BOOL, 'category': 'challenge', 'is_runtime': True},
    )
    with pytest.raises(GitlabConfigError):
        GitlabService.list_projects()


def test_missing_url_raises_config_error(db):
    SystemConfig.objects.update_or_create(
        key='challenge.git.enabled',
        defaults={'value': True, 'value_type': SystemConfig.ConfigType.BOOL, 'category': 'challenge', 'is_runtime': True},
    )
    SystemConfig.objects.update_or_create(
        key='challenge.git.token',
        defaults={'value': 'tok', 'value_type': SystemConfig.ConfigType.SECRET, 'category': 'challenge', 'is_runtime': True},
    )
    # url left unset/empty
    with pytest.raises(GitlabConfigError):
        GitlabService.list_projects()


def test_list_projects_normalizes(gitlab_config):
    raw = [
        {
            'id': 42,
            'name': 'My CTF',
            'path_with_namespace': 'ctf/my-ctf',
            'web_url': 'https://gitlab.example.com/ctf/my-ctf',
            'default_branch': 'main',
            'extra': 'ignored',
        }
    ]
    fake = MagicMock()
    fake.read.return_value = __import__('json').dumps(raw).encode('utf-8')
    fake.__enter__.return_value = fake
    fake.__exit__.return_value = False

    with patch('api.services.gitlab_service.urlopen', return_value=fake):
        items = GitlabService.list_projects(search='ctf')

    assert items == [
        {
            'id': 42,
            'name': 'My CTF',
            'path_with_namespace': 'ctf/my-ctf',
            'web_url': 'https://gitlab.example.com/ctf/my-ctf',
            'default_branch': 'main',
        }
    ]


def test_network_error_maps_to_unavailable(gitlab_config):
    with patch('api.services.gitlab_service.urlopen', side_effect=URLError('boom')):
        with pytest.raises(GitlabUnavailableError):
            GitlabService.list_projects()


def test_http_404_maps_to_not_found(gitlab_config):
    err = HTTPError('https://x', 404, 'Not Found', {}, None)
    with patch('api.services.gitlab_service.urlopen', side_effect=err):
        with pytest.raises(GitlabNotFoundError):
            GitlabService.get_project(999)


def test_http_500_maps_to_unavailable(gitlab_config):
    err = HTTPError('https://x', 500, 'Server Error', {}, None)
    with patch('api.services.gitlab_service.urlopen', side_effect=err):
        with pytest.raises(GitlabUnavailableError):
            GitlabService.list_projects()


def test_get_raw_file_returns_bytes(gitlab_config):
    fake = MagicMock()
    fake.read.return_value = b'PK\x03\x04zip-bytes'
    fake.__enter__.return_value = fake
    fake.__exit__.return_value = False
    with patch('api.services.gitlab_service.urlopen', return_value=fake):
        data = GitlabService.get_raw_file(42, 'attachment.zip', 'main')
    assert data == b'PK\x03\x04zip-bytes'


# ---------------------------------------------------------------------------
# import_from_gitlab — integration contract
# ---------------------------------------------------------------------------

def test_import_creates_challenge_node_gitlab_and_files(db, editor_user):
    project = {
        'id': 42,
        'name': 'My CTF',
        'path_with_namespace': 'ctf/my-ctf',
        'web_url': 'https://gitlab.example.com/ctf/my-ctf',
        'default_branch': 'main',
    }
    with patch(SERVICE) as gl:
        gl.get_project.return_value = project
        gl.get_latest_commit_sha.return_value = 'abc123'
        gl.get_raw_file_text.return_value = '# My CTF\nReadme body'
        gl.get_raw_file.return_value = b'zip-bytes'

        challenge = ChallengeService.import_from_gitlab(
            project_id=42,
            parent_node_id=None,
            selected_files=['attachment.zip'],
            actor=editor_user,
        )

    assert challenge.source == Challenge.Source.GITLAB
    assert challenge.description == '# My CTF\nReadme body'
    assert challenge.gitlab_path == 'ctf/my-ctf'
    assert challenge.status == Challenge.Status.DRAFT

    node = ChallengeNode.objects.get(challenge=challenge)
    assert node.is_item is True

    gitlab_info = ChallengeGitlab.objects.get(challenge=challenge)
    assert gitlab_info.project_id == 42
    assert gitlab_info.last_commit_sha == 'abc123'
    assert gitlab_info.last_synced_at is not None

    files = ChallengeFile.objects.filter(challenge=challenge)
    assert files.count() == 1
    assert files.first().source == ChallengeFile.Source.GITLAB
    assert files.first().filename == 'attachment.zip'
    assert files.first().gitlab_path == 'attachment.zip'


# ---------------------------------------------------------------------------
# sync_gitlab — updates + 503-preserves-old-content
# ---------------------------------------------------------------------------

def _make_gitlab_challenge(actor):
    challenge = Challenge.objects.create(
        slug='gl-challenge',
        title='GL Challenge',
        description='old description',
        status=Challenge.Status.PUBLISHED,
        source=Challenge.Source.GITLAB,
        storage_path='challenges/gl-challenge',
        gitlab_path='ctf/gl',
    )
    ChallengeGitlab.objects.create(
        challenge=challenge,
        project_id=7,
        project_url='https://gitlab.example.com/ctf/gl',
        default_branch='main',
        last_commit_sha='old-sha',
    )
    ChallengeService.store_bytes(
        challenge, 'attachment.zip', b'old-zip',
        source=ChallengeFile.Source.GITLAB, gitlab_path='attachment.zip', actor=actor,
    )
    return challenge


def test_sync_updates_description_files_and_metadata(db, editor_user):
    challenge = _make_gitlab_challenge(editor_user)

    with patch(SERVICE) as gl:
        gl.get_latest_commit_sha.return_value = 'new-sha'
        gl.get_raw_file_text.return_value = 'new description'
        gl.get_raw_file.return_value = b'new-zip'

        ChallengeService.sync_gitlab(challenge=challenge, actor=editor_user)

    challenge.refresh_from_db()
    assert challenge.description == 'new description'

    gitlab_info = ChallengeGitlab.objects.get(challenge=challenge)
    assert gitlab_info.last_commit_sha == 'new-sha'
    assert gitlab_info.last_synced_at is not None

    cf = ChallengeFile.objects.get(challenge=challenge, filename='attachment.zip')
    import os
    abs_path = ChallengeService._absolute_media_path(cf.storage_key)
    with open(abs_path, 'rb') as fh:
        assert fh.read() == b'new-zip'


def test_sync_failure_preserves_old_content(db, editor_user):
    challenge = _make_gitlab_challenge(editor_user)

    with patch(SERVICE) as gl:
        gl.get_latest_commit_sha.return_value = 'new-sha'
        gl.get_raw_file_text.return_value = 'should-not-apply'
        gl.get_raw_file.side_effect = GitlabUnavailableError('down')

        with pytest.raises(GitlabUnavailableError):
            ChallengeService.sync_gitlab(challenge=challenge, actor=editor_user)

    challenge.refresh_from_db()
    # No DB write happened: old description + old sha intact.
    assert challenge.description == 'old description'
    assert ChallengeGitlab.objects.get(challenge=challenge).last_commit_sha == 'old-sha'


def test_sync_non_gitlab_challenge_raises_value_error(db, editor_user):
    challenge = Challenge.objects.create(
        slug='manual-one', title='Manual', status=Challenge.Status.PUBLISHED,
        source=Challenge.Source.MANUAL, storage_path='challenges/manual-one',
    )
    with pytest.raises(ValueError):
        ChallengeService.sync_gitlab(challenge=challenge, actor=editor_user)


# ---------------------------------------------------------------------------
# Endpoint-level: exception → HTTP status + role gating
# ---------------------------------------------------------------------------

def test_sync_endpoint_503_on_unavailable(editor_client, editor_user, db):
    _assign_role(editor_user, 'Editor')
    challenge = _make_gitlab_challenge(editor_user)

    with patch('api.views.challenges.ChallengeService.sync_gitlab', side_effect=GitlabUnavailableError('down')):
        resp = editor_client.post(f'/api/challenge/challenges/{challenge.slug}/sync-gitlab/')
    assert resp.status_code == 503


def test_projects_endpoint_409_when_disabled(editor_client, editor_user, db):
    _assign_role(editor_user, 'Editor')
    with patch('api.views.challenges.GitlabService.list_projects', side_effect=GitlabConfigError('disabled')):
        resp = editor_client.get('/api/challenge/gitlab/projects/')
    assert resp.status_code == 409


def test_member_cannot_list_gitlab_projects(member_client, member_user):
    _assign_role(member_user, 'Member')
    assert member_client.get('/api/challenge/gitlab/projects/').status_code == 403
