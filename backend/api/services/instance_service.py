"""
Instance Service
Wave 1: MockDeploymentBackend — DB records are real, connection info is mocked.
Wave 2: Swap MockDeploymentBackend for SocketDeploymentBackend (no API change needed).
"""
import secrets
import string
from abc import ABC, abstractmethod
from typing import Any


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


class MockDeploymentBackend(InstanceDeploymentBackend):
    """
    Wave 1 mock backend — no external calls.
    Generates a fake instance_info and a plaintext instance flag when applicable.
    """

    def deploy(self, instance) -> dict[str, Any]:
        from api.services.flag_validation_service import FlagValidationService

        flag_template = (
            instance.challenge.flags
            .filter(random_tail_length__gt=0)
            .first()
        )
        if flag_template is not None:
            instance.challenge_flag = flag_template
            instance.flag_value = FlagValidationService.generate_instance_flag(
                flag_template.flag_value,
                flag_template.random_tail_length,
            )
            instance.save(update_fields=['challenge_flag', 'flag_value'])

        return {
            'host': 'mock-host',
            'port': 8080,
            'note': 'MockDeploymentBackend — Wave 1 stub',
        }

    def stop(self, instance) -> bool:
        return True

    def terminate(self, instance) -> bool:
        return True


def get_deployment_backend() -> InstanceDeploymentBackend:
    """Return the active deployment backend. Swap implementation here for Wave 2."""
    return MockDeploymentBackend()
