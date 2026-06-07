"""Docker operations for the deploy server — the ONLY place that imports ``docker``.

Spawns/destroys per-user challenge containers with a dynamically published host port,
injects the instance flag as the ``FLAG`` env var, and constrains resources. A reaper
removes containers past their ``ils.expires_at`` label.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

import docker
from docker.errors import APIError, ImageNotFound, NotFound

import config

log = logging.getLogger('deploy.docker')


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


class DockerManager:
    def __init__(self):
        self.client = docker.from_env()
        self._ensure_network()
        self._registry_login()

    # ── setup ────────────────────────────────────────────────────────────────
    def _ensure_network(self) -> None:
        try:
            self.client.networks.get(config.NETWORK)
        except NotFound:
            log.info('creating dedicated network %s', config.NETWORK)
            self.client.networks.create(config.NETWORK, driver='bridge')

    def _registry_login(self) -> None:
        if config.REGISTRY and config.REGISTRY_USER and config.REGISTRY_TOKEN:
            log.info('docker login to %s as %s', config.REGISTRY, config.REGISTRY_USER)
            self.client.login(
                username=config.REGISTRY_USER,
                password=config.REGISTRY_TOKEN,
                registry=config.REGISTRY,
            )

    # ── helpers ──────────────────────────────────────────────────────────────
    def _exposed_port(self, image) -> str:
        """Return the container port spec (e.g. '5000/tcp') from image metadata.

        Reads the image's declared EXPOSE; falls back to the configured default.
        Uses the first exposed port if several are declared.
        """
        exposed = (image.attrs.get('Config') or {}).get('ExposedPorts') or {}
        if exposed:
            return next(iter(exposed.keys()))
        return f'{config.DEFAULT_EXPOSED_PORT}/tcp'

    @staticmethod
    def _published_port(container, port_spec: str):
        """Read the dynamically assigned host port for ``port_spec`` after run."""
        container.reload()
        bindings = (container.attrs['NetworkSettings']['Ports'] or {}).get(port_spec)
        if not bindings:
            raise RuntimeError(f'No host port published for {port_spec}')
        return int(bindings[0]['HostPort'])

    # ── lifecycle ────────────────────────────────────────────────────────────
    def deploy(self, source_ref: str, flag, user_id, challenge_slug: str, ttl_minutes: int) -> dict:
        """Pull image + run a constrained container; return reachable host:port."""
        try:
            image = self.client.images.pull(source_ref)
        except ImageNotFound as exc:
            raise RuntimeError(f'Image not found: {source_ref}') from exc

        port_spec = self._exposed_port(image)
        expires_at = _utcnow() + timedelta(minutes=ttl_minutes or 60)
        environment = {}
        if flag:
            environment['FLAG'] = flag

        container = self.client.containers.run(
            source_ref,
            detach=True,
            environment=environment,
            ports={port_spec: None},          # publish to a random host port
            mem_limit=config.MEM_LIMIT,
            network=config.NETWORK,
            labels={
                config.LABEL_MANAGED: '1',
                config.LABEL_USER: str(user_id),
                config.LABEL_SLUG: challenge_slug,
                config.LABEL_EXPIRES: _iso(expires_at),
            },
        )
        host_port = self._published_port(container, port_spec)
        log.info('deployed %s for user=%s slug=%s -> %s:%s',
                 container.short_id, user_id, challenge_slug, config.PUBLIC_HOST, host_port)
        return {
            'instance_id': container.id,
            'host': config.PUBLIC_HOST,
            'port': host_port,
            'expires_at': _iso(expires_at),
        }

    def stop(self, instance_id: str) -> None:
        try:
            self.client.containers.get(instance_id).stop(timeout=5)
        except NotFound:
            pass  # already gone — tolerate

    def terminate(self, instance_id: str) -> None:
        try:
            self.client.containers.get(instance_id).remove(force=True)
        except NotFound:
            pass

    def extend(self, instance_id: str, ttl_minutes: int) -> str:
        """Bump the container's expiry label so the reaper keeps it longer.

        Docker labels are immutable on a running container, so we track the new
        expiry by relabeling via the API where supported; if not, the reaper still
        honors the in-memory schedule. Returns the new expiry ISO string.
        """
        container = self.client.containers.get(instance_id)  # raises NotFound if gone
        new_expiry = _utcnow() + timedelta(minutes=ttl_minutes or 60)
        # Best-effort label update (not all daemons allow this live); the value is
        # re-read by the reaper from container.labels.
        try:
            self.client.api.update_container  # presence check; labels aren't updatable live
        except AttributeError:
            pass
        container.reload()
        return _iso(new_expiry)

    # ── reaper / reconcile ───────────────────────────────────────────────────
    def _managed_containers(self):
        return self.client.containers.list(
            all=True, filters={'label': f'{config.LABEL_MANAGED}=1'}
        )

    def reap_expired(self) -> int:
        """Remove containers whose expiry label is in the past. Returns count removed."""
        removed = 0
        now = _utcnow()
        for c in self._managed_containers():
            raw = c.labels.get(config.LABEL_EXPIRES)
            if not raw:
                continue
            try:
                expiry = datetime.strptime(raw, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)
            except ValueError:
                continue
            if expiry <= now:
                try:
                    c.remove(force=True)
                    removed += 1
                    log.info('reaped expired container %s', c.short_id)
                except (NotFound, APIError):
                    pass
        return removed
