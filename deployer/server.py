"""ILS deploy server — TCP listener that spawns per-user challenge containers.

Protocol: docs/integrations/deploy-socket-protocol.md (newline-delimited JSON, one
request + one response per connection, NO auth token). SECURITY: bind to a private
interface only (config.BIND_ADDR defaults to 127.0.0.1).

Run:  python server.py
"""
from __future__ import annotations

import json
import logging
import socketserver
import threading
import time

import config

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s %(message)s',
)
log = logging.getLogger('deploy.server')


def dispatch(manager, request: dict) -> dict:
    """Map one parsed request dict to a response dict. Pure-ish: testable with a
    mock manager. Never raises — converts errors to ``{ok: false, error}``.
    """
    cmd = request.get('cmd')
    try:
        if cmd == 'deploy':
            info = manager.deploy(
                source_ref=request['source_ref'],
                flag=request.get('flag'),
                user_id=request.get('user_id'),
                challenge_slug=request.get('challenge_slug', ''),
                ttl_minutes=request.get('ttl_minutes', 60),
            )
            return {'ok': True, **info}

        if cmd == 'stop':
            manager.stop(request['instance_id'])
            return {'ok': True}

        if cmd == 'terminate':
            manager.terminate(request['instance_id'])
            return {'ok': True}

        if cmd == 'extend':
            expires_at = manager.extend(request['instance_id'], request.get('ttl_minutes', 60))
            return {'ok': True, 'expires_at': expires_at}

        return {'ok': False, 'error': f'Unknown command: {cmd!r}'}
    except KeyError as exc:
        return {'ok': False, 'error': f'Missing field: {exc.args[0]}'}
    except Exception as exc:  # noqa: BLE001 — never crash the listener
        log.exception('command %s failed', cmd)
        return {'ok': False, 'error': str(exc)}


class _Handler(socketserver.StreamRequestHandler):
    def handle(self):
        manager = self.server.manager
        try:
            line = self.rfile.readline()
            if not line:
                return
            request = json.loads(line.decode('utf-8'))
            if not isinstance(request, dict):
                reply = {'ok': False, 'error': 'Request must be a JSON object.'}
            else:
                reply = dispatch(manager, request)
        except ValueError:
            reply = {'ok': False, 'error': 'Invalid JSON.'}
        except Exception as exc:  # noqa: BLE001
            log.exception('handler error')
            reply = {'ok': False, 'error': str(exc)}
        self.wfile.write((json.dumps(reply) + '\n').encode('utf-8'))


class DeployTCPServer(socketserver.ThreadingTCPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, addr, manager):
        super().__init__(addr, _Handler)
        self.manager = manager


def _reaper_loop(manager, stop_event: threading.Event):
    while not stop_event.is_set():
        try:
            manager.reap_expired()
        except Exception:  # noqa: BLE001
            log.exception('reaper iteration failed')
        stop_event.wait(config.REAPER_INTERVAL_SECONDS)


def main():
    from docker_manager import DockerManager  # imported here so tests can skip docker
    manager = DockerManager()

    # Startup reconcile: reap any orphaned expired containers from a previous run.
    reaped = manager.reap_expired()
    if reaped:
        log.info('startup reconcile removed %d expired containers', reaped)

    stop_event = threading.Event()
    threading.Thread(target=_reaper_loop, args=(manager, stop_event), daemon=True).start()

    server = DeployTCPServer((config.BIND_ADDR, config.LISTEN_PORT), manager)
    log.info('deploy server listening on %s:%s (NO AUTH — keep this private)',
             config.BIND_ADDR, config.LISTEN_PORT)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log.info('shutting down')
    finally:
        stop_event.set()
        server.shutdown()


if __name__ == '__main__':
    main()
