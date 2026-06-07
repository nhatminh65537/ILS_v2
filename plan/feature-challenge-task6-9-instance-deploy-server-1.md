---
goal: Task 6.9 (Phase 2) — Challenge Instance Deployment (Socket Backend + External Deploy Server)
version: 1.1
date_created: 2026-06-06
last_updated: 2026-06-07
owner: ILS v2 team
status: 'Code complete — pending manual e2e'
tags: [feature, challenge, instance, deployment, docker, slice-6]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan delivers **Phase 2**: real per-user challenge instances. It (1) closes existing gaps in the ILS instance flow (deploy-enabled gate, TTL, provider selection, race handling), (2) defines the ILS↔deploy-server socket contract and implements `SocketDeploymentBackend`, and (3) builds the **external deploy server** (a separate, lightweight Python + Docker-SDK service) that actually spawns containers. Phase 1 (attachment + GitLab) is a prerequisite for image/source provenance and is tracked in `feature-challenge-task6-8-attachment-gitlab-1.md`.

Architectural principle (REQUIREMENTS §2.4 + DECISIONS R-ARCH-12): **ILS does not spawn containers and does not import `docker`.** It only talks to an external deploy server over a TCP socket via the existing `InstanceDeploymentBackend` Strategy interface. The `docker` SDK lives ONLY in the deploy server. Switching from mock to real deployment is a `system_config` change — no view/serializer/frontend edits.

## 1. Requirements & Constraints

- **REQ-001**: `instance_start` must return 403 "Instance deployment is disabled" when `system_config[challenge.deploy.enabled]` is false (AC-CHAL-07).
- **REQ-002**: Add `system_config[challenge.deploy.provider]` (`'mock'` default, `'socket'` for real) and make `get_deployment_backend()` select the backend from it (G3).
- **REQ-003**: Deploy backend must set `ChallengeInstance.expires_at` from `system_config[challenge.instance_ttl_minutes]` (G2).
- **REQ-004**: Concurrent `instance_start` causing the partial-unique-index `IntegrityError` must surface as 409 "Instance already running", not 500 (G4).
- **REQ-005**: Define a deploy socket contract (`docs/integrations/deploy-socket-protocol.md`) — newline-delimited JSON over TCP, per-message `token` auth, commands `deploy`/`stop`/`terminate`.
- **REQ-006**: Implement `SocketDeploymentBackend` satisfying `InstanceDeploymentBackend` (deploy/stop/terminate) using only the standard-library `socket`; read `challenge.deploy.api_url` (host:port) and `challenge.deploy.api_token`.
- **REQ-007**: Build the external deploy server: TCP listener + Docker SDK; `deploy` runs a container with a dynamic published port and returns `host:port`; `stop`/`terminate` stop/remove the container; a reaper removes expired containers.
- **REQ-008**: Image provenance via `source_ref`: prefer `docker pull` from GitLab Container Registry; fall back to build from the repo `deploy/` build-context. ILS stores the `source_ref` per challenge.
- **SEC-001**: `challenge.deploy.api_token` is an encrypted secret; the deploy server rejects messages with a missing/invalid token. The instance-specific flag (`ChallengeInstance.flag_value`) is never returned to clients.
- **SEC-002**: Deploy server constrains containers (memory limit, dedicated network, no host mounts) to isolate untrusted challenge code.
- **CON-001**: No changes to instance API contract, serializers, or frontend when enabling the real backend — only `system_config` flips.
- **CON-002**: `docker` (docker-py) is added ONLY to the deploy-server repo's requirements, never to `backend/requirements.txt`.
- **GUD-001**: Reuse the existing `ChallengeInstance.start()/stop()/terminate()` lifecycle and `instance_service.get_deployment_backend()` factory; keep the instance-flag generation in `flag_validation_service.generate_instance_flag()`.
- **PAT-001**: Update `docs/CONFIG.md` (+ `seed_config.py`), `docs/API.md`, `docs/STATUS.md`, and `docs/DECISIONS.md` (R-ARCH-12 follow-up) in the same session.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Close ILS-side instance gaps and add provider selection (works on Mock, independent of deploy server).

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | In `backend/api/views/challenges.py` `instance_start`: read `get_config('challenge.deploy.enabled', False)`; if false return 403 "Instance deployment is disabled" (AC-CHAL-07). | | |
| TASK-002 | Wrap instance creation/start in `instance_start` (and/or `ChallengeService.create_instance`) to catch `django.db.IntegrityError` from the partial unique index → return 409 "Instance already running" (G4). | | |
| TASK-003 | Add `challenge.deploy.provider` (default `'mock'`) to `backend/api/management/commands/seed_config.py` and document it in `docs/CONFIG.md §challenge.deploy`. | | |
| TASK-004 | Update `get_deployment_backend()` in `backend/api/services/instance_service.py` to read `get_config('challenge.deploy.provider','mock')` and return `MockDeploymentBackend` or `SocketDeploymentBackend`. | | |
| TASK-005 | Set `ChallengeInstance.expires_at` from `get_config('challenge.instance_ttl_minutes',60)` at deploy time (apply in both backends / in `ChallengeInstance.start()` after deploy returns) (G2). | | |

### Implementation Phase 2

- GOAL-002: Define the socket contract and implement `SocketDeploymentBackend` in ILS.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Write `docs/integrations/deploy-socket-protocol.md`: newline-delimited JSON over TCP; `deploy` `{cmd,token,challenge_slug,user_id,source_ref,ttl_minutes}` → `{ok,instance_id,host,port,expires_at,error?}`; `stop`/`terminate` `{cmd,token,instance_id}` → `{ok,error?}`. Document timeouts, error codes, and `source_ref` semantics (image vs build-context). | | |
| TASK-007 | Implement `SocketDeploymentBackend(InstanceDeploymentBackend)` in `instance_service.py`: parse `challenge.deploy.api_url` into host:port, open `socket` with timeout, send the JSON line, read the JSON reply, map to `instance_info` (host/port/instance_id), set `flag_value` when `random_tail_length>0`, set `expires_at`; raise on `ok=false`/timeout/parse-error. | | |
| TASK-008 | Resolve `source_ref` per challenge: add a `source_ref` field/config path (e.g. `ChallengeGitlab` image ref or a `Challenge.deploy_source_ref` column + migration) and pass it through `start()`. Store deploy `instance_id` inside `instance_info` for later stop/terminate. | | |
| TASK-009 | Add `backend/api/tests/test_socket_backend.py`: a fake in-process TCP echo server returning canned replies; verify `deploy/stop/terminate` parsing, timeout → exception, `ok=false` → exception, and provider switch (`provider='socket'`). | | |

### Implementation Phase 3

- GOAL-003: Build the external deploy server (separate repo `ils-deploy-server/`).

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-010 | Scaffold repo `ils-deploy-server/`: `server.py` (TCP listener), `docker_manager.py` (docker-py wrapper), `config.py` (token, public host, port range, mem limit, network), `requirements.txt` (`docker`), `README.md`, and a `systemd` unit or `docker-compose.yml` to run it as a daemon. | | |
| TASK-011 | Implement TCP server (`socketserver.ThreadingTCPServer` or asyncio): read newline-delimited JSON, validate `token`, dispatch by `cmd`, always reply one JSON line; never crash the listener on a bad message. | | |
| TASK-012 | Implement `deploy`: `docker.from_env().containers.run(source_ref, detach=True, ports={'<exposed>/tcp': None}, labels={'ils.user','ils.slug'}, mem_limit, network)`; read `container.ports` for the dynamic host port; return `{ok,instance_id=container.id,host=<public host>,port,expires_at}`. Support `docker pull` (registry) and build-from-context fallback. | | |
| TASK-013 | Implement `stop`/`terminate` by `instance_id`: `container.stop()` / `container.remove(force=True)`; tolerate already-gone containers. | | |
| TASK-014 | Implement a reaper thread: track `expires_at`, periodically remove expired containers; on startup, reconcile orphaned `ils.*`-labeled containers. | | |
| TASK-015 | Manual integration: on a Docker host run `ils-deploy-server`, set `challenge.deploy.{enabled=true,provider='socket',api_url='host:port',api_token}`; start an instance from ILS → container runs and is reachable at `host:port`; stop/admin-kill removes it; TTL expiry removes it. Update `docs/STATUS.md`, `docs/API.md`, `docs/DECISIONS.md` (R-ARCH-12 follow-up). | | |

## 3. Alternatives

- **ALT-001**: ILS spawns Docker containers directly (import `docker` into Django). Rejected — violates REQUIREMENTS §2.4 (deploy is a separate project) and couples ILS to a Docker host.
- **ALT-002**: HTTP/gRPC backend instead of raw socket. Deferred — the Strategy interface allows adding `HttpDeploymentBackend`/`GrpcDeploymentBackend` later without changing callers; raw socket is the course requirement for now.
- **ALT-003**: One shared container per challenge (no per-user instances) via static `docker compose up`. Rejected — breaks "one instance per user" and makes instance-specific random-tail flags unusable.
- **ALT-004**: Deploy server builds every image from Dockerfile on each deploy. Kept as fallback only; registry `pull` is preferred for speed.

## 4. Dependencies

- **DEP-001**: `InstanceDeploymentBackend` Protocol + `MockDeploymentBackend` + `get_deployment_backend()` in `backend/api/services/instance_service.py`.
- **DEP-002**: `ChallengeInstance.start()/stop()/terminate()` lifecycle and the partial unique index `uq_challenge_instance_active`.
- **DEP-003**: `flag_validation_service.generate_instance_flag()` for instance-specific flags.
- **DEP-004**: `system_config` keys `challenge.deploy.{enabled,api_url,api_token}` + `challenge.instance_ttl_minutes` (CONFIG.md) and new `challenge.deploy.provider`.
- **DEP-005**: Phase 1 attachment/GitLab plan for `source_ref` provenance (GitLab Container Registry image or `deploy/` build-context).
- **DEP-006**: A Docker host (engine + socket) to run the deploy server; `docker` (docker-py) in the deploy-server repo only.

## 5. Files

- **FILE-001**: `backend/api/views/challenges.py` (deploy-enabled gate G1, 409 race handling G4).
- **FILE-002**: `backend/api/services/instance_service.py` (provider selection G3, TTL G2, `SocketDeploymentBackend`).
- **FILE-003**: `backend/api/management/commands/seed_config.py`, `docs/CONFIG.md` (`challenge.deploy.provider`).
- **FILE-004**: `backend/api/models.py` + migration (optional `Challenge.deploy_source_ref` or reuse `ChallengeGitlab`).
- **FILE-005**: `docs/integrations/deploy-socket-protocol.md` (new contract spec).
- **FILE-006**: `ils-deploy-server/` (new external repo: `server.py`, `docker_manager.py`, `config.py`, `requirements.txt`, `README.md`, daemon unit).
- **FILE-007**: `backend/api/tests/test_socket_backend.py` (fake socket server tests).
- **FILE-008**: `docs/API.md`, `docs/STATUS.md`, `docs/DECISIONS.md` (doc propagation).

## 6. Testing

- **TEST-001**: `pytest backend/api/tests/test_instance_api.py` (or existing) — `deploy.enabled=false` → 403 (AC-CHAL-07); second `instance_start` → 409 (AC-CHAL-05).
- **TEST-002**: `pytest backend/api/tests/test_socket_backend.py` — fake TCP server: deploy/stop/terminate parse correctly; timeout and `ok=false` raise; provider switch mock↔socket via config.
- **TEST-003**: Deploy-server unit tests (in `ils-deploy-server/`) — mock docker-py client: `deploy` returns dynamic port, `stop`/`terminate` call container methods, reaper removes expired.
- **TEST-004**: Manual e2e on a Docker host — start instance from ILS, reach `host:port`, admin-kill removes container, TTL expiry removes container.

## 7. Risks & Assumptions

- **RISK-001**: Untrusted challenge containers are a security boundary; without mem/network/mount limits a container could abuse the host. Enforce constraints in `docker_manager.py` (SEC-002).
- **RISK-002**: Dynamic port exhaustion / firewall exposure on the Docker host; bound the port range and document host networking.
- **RISK-003**: Orphaned containers if the deploy server restarts mid-lifecycle; mitigated by label-based reconciliation on startup (TASK-014).
- **RISK-004**: Socket protocol drift between ILS and deploy server; the versioned contract doc (TASK-006) is the single source of truth.
- **ASSUMPTION-001**: A Docker host is available and the deploy server runs co-located with or network-reachable from ILS.
- **ASSUMPTION-002**: `source_ref` images are produced by the challenge repos' CI (GitLab Registry) or buildable from `deploy/`.

## 7.1 Implementation Notes (2026-06-07 — code complete)

Delivered with these refinements vs the original plan (see
`docs/reports/2026-06-07_task6-9-instance-deploy.md`):

- **No socket auth token** — deploy server binds to a private interface (`127.0.0.1`)
  and has no auth. `challenge.deploy.api_token` was dropped (not seeded). REQ/SEC-001's
  token is deferred; documented as a security constraint instead.
- **Exposed port read from the image** — the deploy server reads `Config.ExposedPorts`
  (Dockerfile `EXPOSE`) and publishes a random host port; ILS sends no port. No extra
  column/config on ILS.
- **`flag` is part of `deploy`** — ILS generates the per-user flag first and sends it so
  the deploy server injects it as the container env `FLAG` (this closed a gap: the
  container must receive the instance flag for the anti-share mechanism to work).
- **TTL display + extend** — `expires_at` drives a FE countdown; `instance/extend` is
  gated by `challenge.instance_extend_threshold_minutes`; lazy-expiry marks expired
  instances terminated without a cron (deploy-server reaper kills the container).
- **`deploy-server/` lives in-repo** beside `backend/`/`frontend/` (not a separate repo);
  it has its own `.venv` and tests; `docker` stays out of `backend/requirements.txt`.
- **Real sample challenge** `challenges/baby-file-reader` created on the live GitLab; CI
  built + pushed `registry.n3m3s1s.org/challenges/baby-file-reader:latest`.
- **Pending:** USER manual e2e (TASK-015) on the Docker host.

## 8. Related Specifications / Further Reading

- `docs/IMPL_PLAN.md` (Slice 6 — instance management)
- `docs/prd/04-challenge.md` (FR-CHAL-06 Instance Deployment, FR-CHAL-06.1 pluggable backend, AC-CHAL-05/07)
- `docs/REQUIREMENTS.md §2.4` (deployable challenges, Strategy pattern, deploy is a separate project)
- `docs/DECISIONS.md` (Q-CHALL-01, Q-CHALL-02 → R-ARCH-12)
- `docs/CONFIG.md §challenge.deploy` (deploy config keys)
- `backend/api/services/instance_service.py` (current Mock backend + Strategy interface)
- `plan/feature-challenge-task6-8-attachment-gitlab-1.md` (Phase 1 — attachment + GitLab, prerequisite)
