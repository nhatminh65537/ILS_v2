"""Phase 2 tests for SocketDeploymentBackend (Task 6.9).

Uses an in-process fake TCP server returning canned newline-JSON replies — no real
deploy server or Docker required. Verifies deploy/stop/terminate/extend parsing,
error mapping (timeout, ok=false), and provider switch via system_config.
"""
import json
import socket
import threading

import pytest
from django.core.cache import cache

from api.models import (
    Challenge,
    ChallengeCategory,
    ChallengeFlag,
    ChallengeInstance,
    SystemConfig,
)
from api.services import instance_service
from api.services.instance_service import (
    DeployRejectedError,
    DeployUnavailableError,
    SocketDeploymentBackend,
    get_deployment_backend,
)

pytestmark = pytest.mark.integration


class _FakeDeployServer:
    """One-shot fake TCP server: reads a JSON line, replies with a canned response.

    ``responder(request_dict) -> dict`` produces the reply. If ``hang`` is True the
    server accepts the connection but never replies (to exercise client timeout).
    """

    def __init__(self, responder=None, hang=False):
        self.responder = responder or (lambda req: {'ok': True})
        self.hang = hang
        self.requests = []
        self._sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._sock.bind(('127.0.0.1', 0))
        self._sock.listen(1)
        self.host, self.port = self._sock.getsockname()
        self._thread = threading.Thread(target=self._serve, daemon=True)
        self._thread.start()

    def _serve(self):
        try:
            conn, _ = self._sock.accept()
        except OSError:
            return
        with conn:
            buf = bytearray()
            try:
                while b'\n' not in buf:
                    chunk = conn.recv(4096)
                    if not chunk:
                        break
                    buf.extend(chunk)
                if b'\n' in buf:
                    req = json.loads(bytes(buf).split(b'\n', 1)[0].decode('utf-8'))
                    self.requests.append(req)
                if self.hang:
                    threading.Event().wait(5)  # never reply within client timeout
                    return
                reply = self.responder(self.requests[-1] if self.requests else {})
                conn.sendall((json.dumps(reply) + '\n').encode('utf-8'))
            except (OSError, ValueError):
                pass

    def close(self):
        try:
            self._sock.close()
        except OSError:
            pass


def _configure_socket_backend(host, port, *, deploy_timeout=None):
    SystemConfig.objects.update_or_create(
        key='challenge.deploy.enabled',
        defaults={'value': True, 'value_type': SystemConfig.ConfigType.BOOL,
                  'category': 'challenge', 'is_editable': True, 'is_runtime': True},
    )
    SystemConfig.objects.update_or_create(
        key='challenge.deploy.provider',
        defaults={'value': 'socket', 'value_type': SystemConfig.ConfigType.STRING,
                  'category': 'challenge', 'is_editable': True, 'is_runtime': True},
    )
    SystemConfig.objects.update_or_create(
        key='challenge.deploy.api_url',
        defaults={'value': f'{host}:{port}', 'value_type': SystemConfig.ConfigType.STRING,
                  'category': 'challenge', 'is_editable': True, 'is_runtime': True},
    )
    cache.clear()


@pytest.fixture
def challenge_with_flag(db):
    cat = ChallengeCategory.objects.create(name='Web')
    ch = Challenge.objects.create(
        slug='sock-chal', title='Sock Chal',
        status=Challenge.Status.PUBLISHED, category=cat,
        storage_path='challenges/sock', instance_required=True,
        deploy_source_ref='registry.example/grp/sock:latest',
    )
    ChallengeFlag.objects.create(challenge=ch, flag_value='ILS{base_', random_tail_length=8)
    return ch


@pytest.fixture
def instance(db, challenge_with_flag, member_user):
    return ChallengeInstance.objects.create(user=member_user, challenge=challenge_with_flag)


# ── provider switch ──────────────────────────────────────────────────────────
def test_provider_switch_returns_socket_backend(db):
    SystemConfig.objects.update_or_create(
        key='challenge.deploy.provider',
        defaults={'value': 'socket', 'value_type': SystemConfig.ConfigType.STRING,
                  'category': 'challenge', 'is_editable': True, 'is_runtime': True},
    )
    cache.clear()
    assert isinstance(get_deployment_backend(), SocketDeploymentBackend)


def test_provider_default_returns_mock_backend(db):
    cache.clear()
    assert isinstance(get_deployment_backend(), instance_service.MockDeploymentBackend)


# ── deploy ───────────────────────────────────────────────────────────────────
def test_deploy_parses_reply_and_sends_flag(instance):
    server = _FakeDeployServer(responder=lambda req: {
        'ok': True, 'instance_id': 'cabc123', 'host': 'localhost', 'port': 49183,
    })
    try:
        _configure_socket_backend(server.host, server.port)
        info = SocketDeploymentBackend().deploy(instance)
    finally:
        server.close()

    assert info == {'host': 'localhost', 'port': 49183, 'deploy_instance_id': 'cabc123'}
    # request carried the generated flag + source_ref + identifiers
    req = server.requests[0]
    assert req['cmd'] == 'deploy'
    assert req['source_ref'] == 'registry.example/grp/sock:latest'
    assert req['challenge_slug'] == 'sock-chal'
    assert req['user_id'] == instance.user_id
    assert req['flag'] and req['flag'].startswith('ILS{base_')
    # flag persisted on the instance for later submission validation
    instance.refresh_from_db()
    assert instance.flag_value == req['flag']


def test_deploy_ok_false_raises_rejected(instance):
    server = _FakeDeployServer(responder=lambda req: {'ok': False, 'error': 'image not found'})
    try:
        _configure_socket_backend(server.host, server.port)
        with pytest.raises(DeployRejectedError, match='image not found'):
            SocketDeploymentBackend().deploy(instance)
    finally:
        server.close()


def test_deploy_timeout_raises_unavailable(instance, monkeypatch):
    server = _FakeDeployServer(hang=True)
    monkeypatch.setattr(SocketDeploymentBackend, 'DEPLOY_TIMEOUT', 1)
    try:
        _configure_socket_backend(server.host, server.port)
        with pytest.raises(DeployUnavailableError):
            SocketDeploymentBackend().deploy(instance)
    finally:
        server.close()


def test_deploy_no_server_raises_unavailable(instance):
    # Point at a port nothing listens on.
    _configure_socket_backend('127.0.0.1', 1)
    with pytest.raises(DeployUnavailableError):
        SocketDeploymentBackend().deploy(instance)


# ── stop / terminate / extend ────────────────────────────────────────────────
def test_stop_sends_instance_id(instance):
    instance.instance_info = {'deploy_instance_id': 'cabc123'}
    instance.save(update_fields=['instance_info'])
    server = _FakeDeployServer(responder=lambda req: {'ok': True})
    try:
        _configure_socket_backend(server.host, server.port)
        assert SocketDeploymentBackend().stop(instance) is True
    finally:
        server.close()
    assert server.requests[0] == {'cmd': 'stop', 'instance_id': 'cabc123'}


def test_extend_sends_ttl(instance):
    instance.instance_info = {'deploy_instance_id': 'cabc123'}
    instance.save(update_fields=['instance_info'])
    server = _FakeDeployServer(responder=lambda req: {'ok': True, 'expires_at': 'x'})
    try:
        _configure_socket_backend(server.host, server.port)
        assert SocketDeploymentBackend().extend(instance, 60) is True
    finally:
        server.close()
    assert server.requests[0]['cmd'] == 'extend'
    assert server.requests[0]['ttl_minutes'] == 60


def test_control_without_deploy_id_is_noop(instance):
    # No deploy_instance_id stored -> no socket call, returns True.
    instance.instance_info = {}
    instance.save(update_fields=['instance_info'])
    _configure_socket_backend('127.0.0.1', 1)  # would fail if a call were attempted
    assert SocketDeploymentBackend().stop(instance) is True
    assert SocketDeploymentBackend().terminate(instance) is True
