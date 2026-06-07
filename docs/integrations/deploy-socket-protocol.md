# Deploy Socket Protocol (ILS ↔ Deploy Server)

> **Status:** Stable (Task 6.9) · **Version:** `1`
> Single source of truth for the wire contract between ILS (`SocketDeploymentBackend`)
> and the external deploy server (`deployer/`). If this doc and the code disagree,
> this doc wins — update both in the same change.

## 1. Overview

ILS never spawns containers and never imports `docker` (REQUIREMENTS §2.4, DECISIONS
R-ARCH-12). To deploy a per-user challenge instance, ILS opens a TCP connection to the
deploy server and exchanges **one request line and one response line**, both
newline-delimited JSON. The deploy server owns Docker; it pulls the image, runs the
container with a dynamic published port, and returns the reachable `host:port`.

```
ILS (SocketDeploymentBackend)  ──TCP──▶  deployer (server.py)
  {"cmd":"deploy", ...}\n      ──────▶
                              ◀──────  {"ok":true,"host":"localhost","port":49183, ...}\n
```

## 2. Transport

- **Protocol:** TCP. One request, one response, then the connection is closed.
- **Framing:** UTF-8 JSON object on a single line, terminated by `\n` (LF). No
  multi-line messages. The reader consumes up to the first `\n`.
- **Endpoint:** ILS reads `system_config[challenge.deploy.api_url]` as `host:port`
  (e.g. `localhost:9100`). A `scheme://` prefix is tolerated and stripped.
- **Timeouts (ILS side):** `deploy` 30 s (image pull + run can be slow); `stop`,
  `terminate`, `extend` 15 s. On timeout ILS raises `DeployUnavailableError` → HTTP 503.

## 3. Authentication — NONE (deliberately)

This phase ships **without any auth token**. The deploy server does not validate a
shared secret. **Therefore the deploy server MUST bind to a private interface**
(`127.0.0.1` or a trusted LAN behind a firewall) and **MUST NOT be exposed to the
public internet** — anyone who can reach the port can spawn/kill containers. This is an
accepted trade-off for the course/temporary phase. A future revision may reintroduce a
per-message `token` field; clients should ignore unknown fields for forward-compat.

## 4. Commands

Every request is a JSON object with a `cmd` field. Every response is a JSON object with
a boolean `ok` field. On failure, `ok` is `false` and `error` carries a human-readable
reason. Unknown fields MUST be ignored by both sides.

### 4.1 `deploy`

Pull the image and run a fresh container for one user.

Request:
```json
{
  "cmd": "deploy",
  "challenge_slug": "sample-flask-flag",
  "user_id": 42,
  "source_ref": "registry.gitlab.example/challenges/sample-flask-flag:latest",
  "flag": "ILS{sqli_aK9mZ2pQ7xLp}",
  "ttl_minutes": 60
}
```

- `source_ref` — Docker image reference to `docker pull` (preferred) or, as a fallback,
  a build-context the deploy server knows how to build. Resolved by ILS from
  `Challenge.deploy_source_ref`.
- `flag` — the instance-specific flag ILS generated **before** sending. The deploy
  server injects it as the container env var `FLAG` so the user must exploit *their*
  container to recover *their* flag. May be `null` for challenges without instance flags.
- `ttl_minutes` — lifetime hint; the deploy server tags the container so its reaper can
  remove it after expiry.

Response (success):
```json
{
  "ok": true,
  "instance_id": "c1a2b3...",
  "host": "localhost",
  "port": 49183,
  "expires_at": "2026-06-07T14:30:00Z"
}
```

- `instance_id` — opaque container id. ILS stores it in
  `ChallengeInstance.instance_info.deploy_instance_id` for later `stop`/`terminate`/`extend`.
- `host` / `port` — the publicly reachable address (host port chosen dynamically by
  Docker). `host` is the deploy server's configured `PUBLIC_HOST`.
- `expires_at` — informational; ILS authoritatively sets its own `expires_at` from TTL.

The container's **exposed port** is read by the deploy server from the image metadata
(`Config.ExposedPorts` / Dockerfile `EXPOSE`); ILS does not send it.

### 4.2 `stop`

Stop (but do not remove) a running container.
```json
{ "cmd": "stop", "instance_id": "c1a2b3..." }    →   { "ok": true }
```

### 4.3 `terminate`

Stop and remove the container permanently.
```json
{ "cmd": "terminate", "instance_id": "c1a2b3..." }   →   { "ok": true }
```

### 4.4 `extend`

Extend the container's TTL (update its expiry label so the reaper keeps it longer).
```json
{ "cmd": "extend", "instance_id": "c1a2b3...", "ttl_minutes": 60 }
   →   { "ok": true, "expires_at": "2026-06-07T15:30:00Z" }
```

`stop`/`terminate`/`extend` MUST be tolerant of an already-gone container (treat
"not found" as success) so retries and reaper races don't error.

## 5. Errors

| Condition | Wire | ILS mapping |
|-----------|------|-------------|
| Cannot connect / timeout / connection closed early / invalid JSON | (transport) | `DeployUnavailableError` → **503** |
| `{"ok": false, "error": "..."}` | response | `DeployRejectedError` → **503** |
| `challenge.deploy.enabled` false, missing `api_url`, or missing `source_ref` | (ILS local) | `DeployConfigError` → **503** |

The deploy server must **never crash its listener** on a malformed message: catch,
reply `{"ok": false, "error": "..."}`, and keep serving.

## 6. source_ref semantics

- **Image ref (preferred):** a registry path like
  `registry.gitlab.example/challenges/<repo>:latest`. The deploy server runs
  `docker pull` (authenticating with its own `REGISTRY_USER`/`REGISTRY_TOKEN` if set) then
  `docker run`.
- **Build-context (fallback):** if the ref is not a pullable image, the deploy server may
  build from a known `deploy/` context. Pull is preferred for speed.

ILS does not interpret `source_ref` beyond passing it through; only the deploy server
resolves it against Docker/registry.

## 7. Versioning

This contract is version `1`. Additive fields are allowed without a version bump
(receivers ignore unknown fields). Breaking changes bump the version and update both
`SocketDeploymentBackend` and `deployer/` in the same change.

## Related

- `backend/api/services/instance_service.py` — `SocketDeploymentBackend`
- `deployer/` — reference implementation
- `docs/integrations/challenge-repo-format.md` — how a challenge repo produces `source_ref`
- `docs/CONFIG.md §challenge.deploy` — config keys
- `docs/DECISIONS.md` R-ARCH-12 — Strategy pattern, deploy is a separate project
