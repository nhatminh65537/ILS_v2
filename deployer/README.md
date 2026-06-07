# ILS Deployer

A small, standalone service that spawns per-user challenge containers on a Docker host.
ILS talks to it over a TCP socket (newline-delimited JSON) via the
`SocketDeploymentBackend`. This is the **only** component that imports `docker` —
ILS never does (REQUIREMENTS §2.4, DECISIONS R-ARCH-12).

Wire contract: [`docs/integrations/deploy-socket-protocol.md`](../docs/integrations/deploy-socket-protocol.md).

## ⚠️ Security model — no auth

This server has **no authentication**. Anyone who can reach its port can spawn and kill
containers. Therefore:

- Bind to a **private interface only** — `DEPLOY_BIND_ADDR=127.0.0.1` (default) or a
  trusted LAN address behind a firewall.
- **Never** expose the port to the public internet.
- Run ILS and the deploy server co-located or on the same trusted network.

Challenge containers run untrusted code; they are constrained with a memory limit, a
dedicated bridge network, and no host mounts (`docker_manager.py`). Review/raise these
limits for your environment.

## Requirements

- A Docker engine reachable via the default socket (`docker.from_env()`).
- Python 3.11+.

```bash
pip install -r requirements.txt
```

## Configuration (`.env` or env vars)

Copy `.env.example` to `.env` and fill in the registry host + token (and any overrides).
`config.py` loads `.env` on startup; real environment variables take precedence. Keep
`.env` out of version control (it is gitignored).

| Var | Default | Purpose |
|-----|---------|---------|
| `DEPLOY_BIND_ADDR` | `127.0.0.1` | Interface to listen on (keep private). |
| `DEPLOY_LISTEN_PORT` | `9100` | TCP port ILS connects to (`challenge.deploy.api_url`). |
| `DEPLOY_PUBLIC_HOST` | `localhost` | Host advertised back to users for container access. |
| `DEPLOY_MEM_LIMIT` | `256m` | Per-container memory cap. |
| `DEPLOY_NETWORK` | `ils-challenges` | Dedicated bridge network (auto-created). |
| `DEPLOY_DEFAULT_EXPOSED_PORT` | `5000` | Fallback container port if image has no EXPOSE. |
| `DEPLOY_REGISTRY` | `""` | Registry host for `docker login` (e.g. `registry.gitlab.example`). |
| `DEPLOY_REGISTRY_USER` | `""` | Registry username. |
| `DEPLOY_REGISTRY_TOKEN` | `""` | Registry token (GitLab access token w/ `read_registry`). |
| `DEPLOY_REAPER_INTERVAL` | `60` | Seconds between TTL reaper sweeps. |

## Run

```bash
cp .env.example .env   # then edit registry host + token

# directly
python server.py

# or via docker-compose (mounts the host docker socket, reads .env)
docker compose up -d --build
```

## Wire it to ILS

In ILS `system_config`:

```
challenge.deploy.enabled  = true
challenge.deploy.provider = socket
challenge.deploy.api_url  = localhost:9100      # DEPLOY_PUBLIC_HOST:DEPLOY_LISTEN_PORT
```

Set each challenge's `deploy_source_ref` to its image (e.g.
`registry.gitlab.example/challenges/sample-flask-flag:latest`). A user "Launch
Instance" then pulls + runs the image, injects their per-user `FLAG`, and returns
`localhost:<random-port>`.

## How a deploy works

1. ILS sends `{"cmd":"deploy", source_ref, flag, user_id, challenge_slug, ttl_minutes}`.
2. `docker pull source_ref` (logging in to the registry first if configured).
3. Read the image's `EXPOSE`d port; `docker run` with `ports={'<exposed>/tcp': None}`
   so Docker picks a free host port; inject `FLAG`; apply mem/network limits + labels.
4. Read the published host port and reply `{"ok":true, instance_id, host, port, expires_at}`.
5. A reaper thread removes containers past their `ils.expires_at` label; on startup it
   reconciles orphaned `ils.*` containers.

## Tests

Tests live in `tests/` and mock the Docker client (no real engine needed).

```bash
pip install pytest
pytest
```

Unit tests mock the Docker client — no real engine needed.
