"""Deployer configuration (env-driven, with .env support).

All knobs come from environment variables so the same image/script runs in dev and
on a Docker host without code edits. A local ``.env`` (next to this file) is loaded
first — this is where the registry host + token live. See README.md for the security
model.
"""
import os
from pathlib import Path


def _load_dotenv(path: Path) -> None:
    """Minimal ``.env`` loader (stdlib only). KEY=VALUE per line; ``#`` comments and
    blank lines ignored; existing environment variables take precedence.
    """
    if not path.is_file():
        return
    for raw in path.read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, _, value = line.partition('=')
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_dotenv(Path(__file__).resolve().parent / '.env')


def _int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


# ── network ──────────────────────────────────────────────────────────────────
# SECURITY: there is NO auth on the socket. Bind to a private interface only.
BIND_ADDR = os.environ.get('DEPLOY_BIND_ADDR', '127.0.0.1')
LISTEN_PORT = _int('DEPLOY_LISTEN_PORT', 9100)

# Host advertised back to ILS as the reachable address for spawned containers.
PUBLIC_HOST = os.environ.get('DEPLOY_PUBLIC_HOST', 'localhost')

# ── container constraints (SEC-002: isolate untrusted challenge code) ─────────
MEM_LIMIT = os.environ.get('DEPLOY_MEM_LIMIT', '256m')
# Dedicated bridge network for challenge containers (created on startup if absent).
NETWORK = os.environ.get('DEPLOY_NETWORK', 'ils-challenges')
# Default container port if the image declares no EXPOSE (rare; templates use EXPOSE).
DEFAULT_EXPOSED_PORT = _int('DEPLOY_DEFAULT_EXPOSED_PORT', 5000)

# ── registry auth (optional) ─────────────────────────────────────────────────
# A GitLab access token with read_registry is enough to pull private images.
REGISTRY = os.environ.get('DEPLOY_REGISTRY', '')          # e.g. registry.gitlab.example
REGISTRY_USER = os.environ.get('DEPLOY_REGISTRY_USER', '')
REGISTRY_TOKEN = os.environ.get('DEPLOY_REGISTRY_TOKEN', '')

# ── reaper ───────────────────────────────────────────────────────────────────
REAPER_INTERVAL_SECONDS = _int('DEPLOY_REAPER_INTERVAL', 60)

# ── labels ───────────────────────────────────────────────────────────────────
LABEL_PREFIX = 'ils'
LABEL_USER = f'{LABEL_PREFIX}.user'
LABEL_SLUG = f'{LABEL_PREFIX}.slug'
LABEL_EXPIRES = f'{LABEL_PREFIX}.expires_at'   # ISO-8601 UTC string
LABEL_MANAGED = f'{LABEL_PREFIX}.managed'      # marks our containers for reconcile
