"""Unit tests for DockerManager — mock the docker client, no real engine.

Skipped entirely if the ``docker`` package is not installed (it lives only in this
repo's requirements, never in the ILS backend).
"""
from datetime import datetime, timedelta, timezone
from unittest import mock

import pytest

pytest.importorskip('docker')

import config
import docker_manager
from docker_manager import DockerManager


@pytest.fixture
def manager():
    """A DockerManager whose client/network/login are fully mocked."""
    with mock.patch.object(docker_manager.docker, 'from_env') as from_env, \
         mock.patch.object(DockerManager, '_ensure_network'), \
         mock.patch.object(DockerManager, '_registry_login'):
        client = mock.MagicMock()
        from_env.return_value = client
        mgr = DockerManager()
        mgr.client = client
        yield mgr


def _image_with_expose(port='5000/tcp'):
    img = mock.MagicMock()
    img.attrs = {'Config': {'ExposedPorts': {port: {}}}}
    return img


def test_deploy_runs_container_and_returns_dynamic_port(manager):
    manager.client.images.pull.return_value = _image_with_expose('5000/tcp')

    container = mock.MagicMock()
    container.id = 'cfullid123'
    container.short_id = 'cfull'
    container.attrs = {'NetworkSettings': {'Ports': {'5000/tcp': [{'HostPort': '49183'}]}}}
    manager.client.containers.run.return_value = container

    result = manager.deploy(
        source_ref='registry/x:latest', flag='ILS{abc}',
        user_id=42, challenge_slug='sock', ttl_minutes=30,
    )

    assert result['instance_id'] == 'cfullid123'
    assert result['host'] == config.PUBLIC_HOST
    assert result['port'] == 49183

    # FLAG injected as env, port published dynamically, constraints + labels applied.
    _, kwargs = manager.client.containers.run.call_args
    assert kwargs['environment'] == {'FLAG': 'ILS{abc}'}
    assert kwargs['ports'] == {'5000/tcp': None}
    assert kwargs['mem_limit'] == config.MEM_LIMIT
    assert kwargs['network'] == config.NETWORK
    assert kwargs['labels'][config.LABEL_USER] == '42'
    assert kwargs['labels'][config.LABEL_SLUG] == 'sock'
    assert config.LABEL_EXPIRES in kwargs['labels']


def test_deploy_without_flag_omits_env(manager):
    manager.client.images.pull.return_value = _image_with_expose()
    container = mock.MagicMock()
    container.id = 'c'
    container.attrs = {'NetworkSettings': {'Ports': {'5000/tcp': [{'HostPort': '5001'}]}}}
    manager.client.containers.run.return_value = container

    manager.deploy(source_ref='x', flag=None, user_id=1, challenge_slug='s', ttl_minutes=60)
    _, kwargs = manager.client.containers.run.call_args
    assert kwargs['environment'] == {}


def test_stop_and_terminate_tolerate_missing(manager):
    from docker.errors import NotFound
    manager.client.containers.get.side_effect = NotFound('gone')
    # Should not raise.
    manager.stop('missing')
    manager.terminate('missing')


def test_reaper_removes_only_expired(manager):
    now = datetime.now(timezone.utc)
    expired = mock.MagicMock()
    expired.short_id = 'old'
    expired.labels = {config.LABEL_EXPIRES: (now - timedelta(minutes=1)).strftime('%Y-%m-%dT%H:%M:%SZ')}
    alive = mock.MagicMock()
    alive.short_id = 'new'
    alive.labels = {config.LABEL_EXPIRES: (now + timedelta(minutes=30)).strftime('%Y-%m-%dT%H:%M:%SZ')}
    manager.client.containers.list.return_value = [expired, alive]

    removed = manager.reap_expired()

    assert removed == 1
    expired.remove.assert_called_once_with(force=True)
    alive.remove.assert_not_called()
