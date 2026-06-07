"""Unit tests for the deploy server's command dispatch.

These exercise ``server.dispatch`` against a fake manager — no Docker engine and no
``docker`` package required. The Docker-specific logic in ``docker_manager.py`` is
covered separately (``test_docker_manager.py``) and skipped if docker isn't installed.
"""
import server


class FakeManager:
    def __init__(self):
        self.calls = []

    def deploy(self, source_ref, flag, user_id, challenge_slug, ttl_minutes):
        self.calls.append(('deploy', source_ref, flag, user_id, challenge_slug, ttl_minutes))
        return {'instance_id': 'cabc', 'host': 'localhost', 'port': 49183,
                'expires_at': '2026-06-07T14:30:00Z'}

    def stop(self, instance_id):
        self.calls.append(('stop', instance_id))

    def terminate(self, instance_id):
        self.calls.append(('terminate', instance_id))

    def extend(self, instance_id, ttl_minutes):
        self.calls.append(('extend', instance_id, ttl_minutes))
        return '2026-06-07T15:30:00Z'


def test_deploy_returns_connection_info_and_injects_flag():
    m = FakeManager()
    reply = server.dispatch(m, {
        'cmd': 'deploy', 'source_ref': 'img:latest', 'flag': 'ILS{x}',
        'user_id': 42, 'challenge_slug': 'sock', 'ttl_minutes': 30,
    })
    assert reply['ok'] is True
    assert reply['host'] == 'localhost' and reply['port'] == 49183
    assert reply['instance_id'] == 'cabc'
    assert m.calls[0] == ('deploy', 'img:latest', 'ILS{x}', 42, 'sock', 30)


def test_stop_terminate_extend():
    m = FakeManager()
    assert server.dispatch(m, {'cmd': 'stop', 'instance_id': 'c1'}) == {'ok': True}
    assert server.dispatch(m, {'cmd': 'terminate', 'instance_id': 'c1'}) == {'ok': True}
    ext = server.dispatch(m, {'cmd': 'extend', 'instance_id': 'c1', 'ttl_minutes': 60})
    assert ext == {'ok': True, 'expires_at': '2026-06-07T15:30:00Z'}
    assert m.calls == [('stop', 'c1'), ('terminate', 'c1'), ('extend', 'c1', 60)]


def test_unknown_command():
    reply = server.dispatch(FakeManager(), {'cmd': 'frobnicate'})
    assert reply['ok'] is False and 'Unknown command' in reply['error']


def test_missing_field_does_not_crash():
    reply = server.dispatch(FakeManager(), {'cmd': 'deploy'})  # no source_ref
    assert reply['ok'] is False and 'Missing field' in reply['error']


def test_manager_exception_becomes_error_reply():
    class Boom(FakeManager):
        def deploy(self, **kw):
            raise RuntimeError('image not found')

    reply = server.dispatch(Boom(), {'cmd': 'deploy', 'source_ref': 'x'})
    assert reply['ok'] is False and reply['error'] == 'image not found'
