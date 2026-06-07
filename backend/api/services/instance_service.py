"""
Instance Service
Strategy pattern: pluggable deployment backend (Mock / Socket) chọn theo
``system_config[challenge.deploy.provider]``. ILS KHÔNG import ``docker`` —
deploy thật do một deploy-server tách biệt thực hiện qua TCP socket.

- MockDeploymentBackend: DB records thật, connection info giả (không gọi ngoài).
- SocketDeploymentBackend: nói chuyện với deploy-server qua JSON-newline TCP
  (stdlib ``socket``). Xem docs/integrations/deploy-socket-protocol.md.
"""
import json
import socket
from abc import ABC, abstractmethod
from typing import Any

from api.utils import get_config


# ── exception hierarchy (caller maps to HTTP status) ─────────────────────────
class DeployError(Exception):
    """Base cho mọi lỗi deploy."""


class DeployConfigError(DeployError):
    """Deploy bị tắt hoặc thiếu cấu hình (maps to HTTP 503/400)."""


class DeployUnavailableError(DeployError):
    """Deploy-server không với tới được / timeout / phản hồi sai (maps to HTTP 503)."""


class DeployRejectedError(DeployError):
    """Deploy-server trả ``ok=false`` có lý do (maps to HTTP 503)."""


def _assign_instance_flag(instance) -> str | None:
    """Sinh và gán instance-specific flag nếu challenge có flag random-tail.

    Dùng chung cho Mock và Socket backend. Trả về flag plaintext (để Socket
    backend gửi xuống deploy-server inject env ``FLAG``), hoặc None nếu challenge
    không có flag inject được.

    Quy tắc chọn flag:
    - Ưu tiên flag có ``random_tail_length > 0`` → sinh flag RIÊNG per-user
      (base + random tail) để chống chia sẻ flag.
    - Nếu không có, dùng flag TĨNH đầu tiên (non-regex) làm flag instance —
      giá trị nguyên vẹn được inject vào container (mọi user chung 1 flag).
    - Bỏ qua flag regex (không thể inject một pattern vào container).
    """
    from api.services.flag_validation_service import FlagValidationService

    flags = list(instance.challenge.flags.all())
    # 1) Ưu tiên random-tail (per-user unique).
    flag_template = next((f for f in flags if f.random_tail_length > 0), None)
    # 2) Fallback: flag tĩnh non-regex đầu tiên.
    if flag_template is None:
        flag_template = next((f for f in flags if not f.is_regex), None)
    if flag_template is None:
        return None

    instance.challenge_flag = flag_template
    instance.flag_value = FlagValidationService.generate_instance_flag(
        flag_template.flag_value,
        flag_template.random_tail_length,
    )
    instance.save(update_fields=['challenge_flag', 'flag_value'])
    return instance.flag_value


class InstanceDeploymentBackend(ABC):
    """Abstract base for pluggable instance deployment backends (Strategy pattern)."""

    @abstractmethod
    def deploy(self, instance) -> dict[str, Any]:
        """Start/provision the instance. Returns instance_info dict to store on the record."""

    @abstractmethod
    def stop(self, instance) -> bool:
        """Stop a running instance gracefully. Returns True on success."""

    @abstractmethod
    def terminate(self, instance) -> bool:
        """Force-terminate an instance permanently. Returns True on success."""

    @abstractmethod
    def extend(self, instance, ttl_minutes: int) -> bool:
        """Gia hạn TTL của instance (đồng bộ hạn xuống backend). Returns True on success."""


class MockDeploymentBackend(InstanceDeploymentBackend):
    """
    Mock backend — no external calls.
    Generates a fake instance_info and a plaintext instance flag when applicable.
    """

    def deploy(self, instance) -> dict[str, Any]:
        _assign_instance_flag(instance)
        return {
            'host': 'mock-host',
            'port': 8080,
            'note': 'MockDeploymentBackend — stub (no real container)',
        }

    def stop(self, instance) -> bool:
        return True

    def terminate(self, instance) -> bool:
        return True

    def extend(self, instance, ttl_minutes: int) -> bool:
        return True


class SocketDeploymentBackend(InstanceDeploymentBackend):
    """Talk to the external deploy-server over newline-delimited JSON TCP.

    Protocol: docs/integrations/deploy-socket-protocol.md. Mỗi request là 1 dòng
    JSON kết thúc ``\\n``; phản hồi cũng 1 dòng JSON. Deploy-server bind nội bộ
    (no auth token) — xem cảnh báo bảo mật trong contract.

    Chỉ dùng stdlib ``socket`` + ``json`` (CON-002: không thêm dependency, KHÔNG
    import ``docker``).
    """

    DEPLOY_TIMEOUT = 30      # pull image + run container có thể chậm
    CONTROL_TIMEOUT = 15     # stop/terminate/extend nhanh hơn

    @staticmethod
    def _get_endpoint() -> tuple[str, int]:
        """Đọc & validate ``challenge.deploy.api_url`` (host:port). Raise DeployConfigError."""
        if not get_config('challenge.deploy.enabled', False):
            raise DeployConfigError('Instance deployment is disabled.')

        api_url = (get_config('challenge.deploy.api_url', '') or '').strip()
        if not api_url:
            raise DeployConfigError('Missing challenge.deploy.api_url configuration.')

        # Chấp nhận "host:port" hoặc "scheme://host:port" (lấy phần host:port).
        cleaned = api_url.split('://', 1)[-1].rstrip('/')
        if ':' not in cleaned:
            raise DeployConfigError(
                'challenge.deploy.api_url phải có dạng host:port (vd localhost:9100).'
            )
        host, _, port_str = cleaned.partition(':')
        try:
            port = int(port_str)
        except ValueError as exc:
            raise DeployConfigError('Port trong challenge.deploy.api_url không hợp lệ.') from exc
        return host, port

    @classmethod
    def _send(cls, payload: dict, timeout: int) -> dict:
        """Gửi 1 dòng JSON, đọc 1 dòng JSON phản hồi. Mọi lỗi transport →
        DeployUnavailableError. ``ok=false`` → DeployRejectedError.
        """
        host, port = cls._get_endpoint()
        line = (json.dumps(payload) + '\n').encode('utf-8')
        buf = bytearray()
        try:
            with socket.create_connection((host, port), timeout=timeout) as sock:
                sock.settimeout(timeout)
                sock.sendall(line)
                while b'\n' not in buf:
                    chunk = sock.recv(4096)
                    if not chunk:
                        break
                    buf.extend(chunk)
        except (socket.timeout, TimeoutError) as exc:
            raise DeployUnavailableError('Deploy server timed out.') from exc
        except OSError as exc:
            raise DeployUnavailableError('Failed to reach deploy server.') from exc

        if b'\n' not in buf:
            raise DeployUnavailableError('Deploy server closed connection without a reply.')

        try:
            reply = json.loads(bytes(buf).split(b'\n', 1)[0].decode('utf-8'))
        except (ValueError, UnicodeDecodeError) as exc:
            raise DeployUnavailableError('Deploy server returned invalid JSON.') from exc

        if not isinstance(reply, dict):
            raise DeployUnavailableError('Deploy server returned a non-object reply.')
        if not reply.get('ok'):
            raise DeployRejectedError(reply.get('error') or 'Deploy server rejected the request.')
        return reply

    def deploy(self, instance) -> dict[str, Any]:
        source_ref = (instance.challenge.deploy_source_ref or '').strip()
        if not source_ref:
            raise DeployConfigError(
                'Challenge chưa cấu hình deploy_source_ref (image ref).'
            )

        flag = _assign_instance_flag(instance)
        ttl_minutes = get_config('challenge.instance_ttl_minutes', 60)

        reply = self._send(
            {
                'cmd': 'deploy',
                'challenge_slug': instance.challenge.slug,
                'user_id': instance.user_id,
                'source_ref': source_ref,
                'flag': flag,
                'ttl_minutes': ttl_minutes,
            },
            timeout=self.DEPLOY_TIMEOUT,
        )
        return {
            'host': reply.get('host'),
            'port': reply.get('port'),
            'deploy_instance_id': reply.get('instance_id'),
        }

    def _deploy_instance_id(self, instance) -> str | None:
        info = instance.instance_info or {}
        return info.get('deploy_instance_id')

    def stop(self, instance) -> bool:
        deploy_id = self._deploy_instance_id(instance)
        if not deploy_id:
            return True  # không có container thật để dừng
        self._send({'cmd': 'stop', 'instance_id': deploy_id}, timeout=self.CONTROL_TIMEOUT)
        return True

    def terminate(self, instance) -> bool:
        deploy_id = self._deploy_instance_id(instance)
        if not deploy_id:
            return True
        self._send({'cmd': 'terminate', 'instance_id': deploy_id}, timeout=self.CONTROL_TIMEOUT)
        return True

    def extend(self, instance, ttl_minutes: int) -> bool:
        deploy_id = self._deploy_instance_id(instance)
        if not deploy_id:
            return True
        self._send(
            {'cmd': 'extend', 'instance_id': deploy_id, 'ttl_minutes': ttl_minutes},
            timeout=self.CONTROL_TIMEOUT,
        )
        return True


def get_deployment_backend() -> InstanceDeploymentBackend:
    """Return the active deployment backend theo system_config (G3)."""
    provider = (get_config('challenge.deploy.provider', 'mock') or 'mock').strip().lower()
    if provider == 'socket':
        return SocketDeploymentBackend()
    return MockDeploymentBackend()
