# Session Report: Task 6.9 — Challenge Instance Deployment (Socket Backend + Deploy Server)

**Date:** 2026-06-07
**Slices / Areas:** Slice 6 — Challenge instance management (Phase 2 of deploy)

## Summary

Implemented real per-user challenge instance deployment end to end. Closed the ILS-side
gaps (deploy-enabled gate, TTL, provider selection, race handling), defined and
implemented the ILS↔deploy-server socket contract (`SocketDeploymentBackend`, stdlib
`socket` only — ILS never imports `docker`), and built the external `deployer/`
(TCP listener + docker-py wrapper + TTL reaper). Added a TTL countdown + extend feature,
fixed the admin instance serializer to match the existing admin UI, created a copyable
challenge repo template, and produced a **real working sample challenge** on the
self-hosted GitLab whose CI built and pushed a runnable image to the registry. The
deployer was then deployed via Docker CLI and the **full deploy flow verified e2e**
(instance launched, per-user flag injected and recovered, container reaped). A second
round of fixes followed (pagination crash, static-flag injection, admin instance
detail, sidebar link) — see "Follow-up Fixes" below.

## Completed Items

- G1: `instance_start` returns **403** when `challenge.deploy.enabled` is false (AC-CHAL-07).
- G2: `ChallengeInstance.start()` sets `expires_at` from `challenge.instance_ttl_minutes`.
- G3: `challenge.deploy.provider` config + `get_deployment_backend()` selects Mock/Socket.
- G4: race on the partial-unique-index → **409**; deploy failure → **503** (record cleaned up).
- TTL lazy-expiry in `get_running_instance` + `instance_status`; optional `reap_instances` command path documented.
- Extend feature: `POST instance/extend` gated by `challenge.instance_extend_threshold_minutes`; `extend()` on the backend interface + model.
- `Challenge.deploy_source_ref` column + migration `0014`.
- Admin `ChallengeInstanceSerializer` exposes `user_username`/`challenge_slug`/`user_id`/`challenge_id`/`updated_at` (matches the pre-existing admin instances page).
- `SocketDeploymentBackend` (deploy/stop/terminate/extend) + exception hierarchy (`DeployUnavailableError`/`DeployRejectedError`).
- Contract doc `docs/integrations/deploy-socket-protocol.md` + `challenge-repo-format.md`.
- `deployer/`: `server.py`, `docker_manager.py`, `config.py`, reaper, Dockerfile, compose, README, own `.venv` + tests.
- `examples/challenge-template/` (Flask + Dockerfile + .gitlab-ci.yml + challenge.yml + README).
- Real GitLab repo `challenges/baby-file-reader` created + image pushed to `registry.n3m3s1s.org/challenges/baby-file-reader:latest`.
- Frontend: instance countdown + extend button; `deploy_source_ref` prefill in challenge form; i18n (en/vi).
- Tests: `test_instance_api.py` (9), `test_socket_backend.py` (9), `deployer/tests/` (9) — all green; no regressions in challenge suite.

## Key Implementations

### SocketDeploymentBackend (ILS → deploy server)
1. `_get_endpoint()` parses `challenge.deploy.api_url` (`host:port`), erroring if deploy disabled/misconfigured.
2. `_assign_instance_flag()` (shared with Mock) generates the per-user flag **before** sending, returns it.
3. `deploy()` sends one JSON line `{cmd:deploy, challenge_slug, user_id, source_ref, flag, ttl_minutes}`, reads one JSON line, maps to `instance_info={host,port,deploy_instance_id}`.
4. Transport errors (timeout/closed/invalid JSON) → `DeployUnavailableError`; `ok:false` → `DeployRejectedError`.
5. `stop/terminate/extend` reuse `deploy_instance_id` from `instance_info`; no-op when absent.

### Deploy server deploy flow
1. `docker login` at startup if registry creds present.
2. `deploy`: `images.pull(source_ref)`, read `Config.ExposedPorts` for the container port, `containers.run(..., environment={'FLAG':flag}, ports={'<exposed>/tcp':None}, mem_limit, network, labels)`.
3. Read the dynamically published host port from `container.ports`; reply `{ok, instance_id, host=PUBLIC_HOST, port, expires_at}`.
4. Reaper thread removes containers past their `ils.expires_at` label; startup reconciles orphans.
5. Listener never crashes on a bad message — errors become `{ok:false, error}`.

### TTL lazy-expiry + extend
1. `get_running_instance()` marks a running-but-expired instance `terminated` and returns None (frees the unique index; lets the user relaunch). Container itself is reaped by the deploy server.
2. `instance_status` calls it so the UI reflects expiry without a cron.
3. `instance/extend` allows extension only when remaining < threshold; adds `instance_ttl_minutes`, syncs the container label via the socket `extend` command.

## Files Changed

| File | Change Summary |
|------|----------------|
| `backend/api/models.py` (+ migration `0014`) | `Challenge.deploy_source_ref`; `start()` sets `expires_at`; `extend()` method |
| `backend/api/services/instance_service.py` | Rewrote: exceptions, `_assign_instance_flag`, `SocketDeploymentBackend`, provider selection, `extend()` interface |
| `backend/api/services/challenge_service.py` | Lazy-expiry in `get_running_instance` |
| `backend/api/views/challenges.py` | 403 gate, 409/503 handling, `instance_extend`, lazy-expiry in `instance_status` |
| `backend/api/urls.py` | `instance/extend` route |
| `backend/api/serializers/challenge.py` | Admin instance fields; `deploy_source_ref` on detail/write serializers |
| `backend/api/management/commands/seed_config.py` | `provider`, `instance_extend_threshold_minutes`; dropped `api_token` |
| `backend/api/tests/test_instance_api.py`, `test_socket_backend.py` | New test suites |
| `deployer/*` | New external service (`server.py`, `docker_manager.py`, `config.py` + `.env` loader, reaper, Dockerfile, compose, own venv, `tests/`) |
| `examples/challenge-template/*` | New template (pushed to GitLab as `challenges/baby-file-reader`) |
| `docs/integrations/deploy-socket-protocol.md`, `challenge-repo-format.md` | New contract + format docs |
| `frontend/.../ChallengeInstancePanel.tsx`, `ChallengeDetailClient.tsx`, `AdminChallengeForm.tsx`, `AdminChallengeInstancesPageClient.tsx`, `layouts/AdminLayout.tsx`, `useChallenges.ts`, `challenges.service.ts`, `challenge.types.ts`, `messages/{en,vi}.json` | Countdown + extend; `deploy_source_ref` prefill; admin instance detail dialog; sidebar Instances link; i18n |
| `docs/CONFIG.md`, `docs/DATA_MODEL.md` | Config keys + entity column |

## Follow-up Fixes & Verification (same day)

After the initial implementation, these issues were found and fixed:

1. **Deployer restructured** → folder `deploy-server/` renamed to `deployer/`; added `deployer/.env`
   (registry host + token) loaded by a stdlib `.env` loader in `config.py`; tests grouped under
   `deployer/tests/`; compose uses `env_file`.
2. **Deployed via Docker CLI** and **full e2e PASSED** (not just planned):
   - Built `ils-deployer:latest`, ran it mounting `/var/run/docker.sock`, bound `127.0.0.1:9100`.
   - Through the real ILS code path (`SocketDeploymentBackend`): launched a `baby-file-reader`
     instance → deployer pulled the private image, ran the container, injected the per-user `FLAG`,
     returned `localhost:<random-port>`; the path-traversal exploit returned the **exact** instance
     flag (`MATCH: True`); `terminate` removed the container; no orphans.
   - Windows note: Git Bash mangles the socket path → use `MSYS_NO_PATHCONV=1` with `docker run`.
3. **Registry token**: the first token (`glpat-…Deploy`) was **Guest (level 10)** on the project —
   GitLab registry requires **Reporter+** to pull, so login succeeded but pull was denied. A
   **Developer**-level token fixed it. `.env` now holds the bot username + that token.
4. **Admin instances page crash** (`Cannot read properties of undefined (reading 'length')`):
   the admin list endpoint returned a bare array but the FE expected a paginated envelope. Fixed by
   adding `LimitOffsetPagination` to `ChallengeInstanceAdminView` (now `{count,next,previous,results}`)
   + a defensive `Array.isArray(...) ? ... : result?.results ?? []` guard in the page.
5. **Static flag not injected** (user-reported): `_assign_instance_flag` only picked flags with
   `random_tail_length > 0`, so a flag created with tail=0 was silently ignored and the container got
   no `FLAG`. Fixed to **prefer** a random-tail flag but **fall back** to the first static non-regex
   flag (injected verbatim). Regex flags are still skipped.
6. **Admin instance detail**: added `AdminChallengeInstanceSerializer` (extends the base, adds
   `flag_value` + `challenge_flag_template`) used only by the admin endpoint; member-facing serializer
   still hides `flag_value`. FE adds a "Details" dialog showing status, instance flag, flag template,
   connection info, and expiry.
7. **Sidebar**: added an "Instances" nav link under the `challenges` section in `AdminLayout`.

Tests after fixes: `test_instance_api.py` (12) + `test_socket_backend.py` (9) + `deployer/tests/` (9)
= **30 green**; frontend `tsc` clean; i18n JSON valid.

## Notes / Caveats

- **Deploy server has no auth** — bind to `127.0.0.1`/trusted LAN only; never expose publicly. Documented in README + contract.
- **Registry host is `registry.n3m3s1s.org`** (not `registry.gitlab.n3m3s1s.org`). FE prefill derives `registry.<host-without-gitlab.>` from `project_url`; admin can correct it. The sample challenge's real ref is `registry.n3m3s1s.org/challenges/baby-file-reader:latest`.
- **Manual e2e: DONE** — deployer deployed via Docker CLI and a `baby-file-reader` instance launched through the real ILS code path, container reachable, per-user `FLAG` injected and recovered via the exploit, terminate clean. (See Follow-up Fixes §2.)
- **CI fix:** the template `.gitlab-ci.yml` uses dind **without TLS** (`DOCKER_HOST=tcp://docker:2375`, `DOCKER_TLS_CERTDIR=""`) — TLS variants failed on the available runner.
- **Cloudflare:** the self-hosted GitLab is behind Cloudflare which blocks the default `urllib` UA; API scripts must send a custom `User-Agent` (matches `GitlabService`).
- **GitLab group bot token:** the batch Commits API returned 403/1010; the per-file Files API works. Repo was populated file-by-file.
- **`docker` (docker-py)** is only in `deployer/requirements.txt`, never in `backend/requirements.txt` (CON-002).
- **Registry pull needs Reporter+** on the project; a Guest-level token logs in but cannot pull.
- **User action:** revoke the registry tokens shared in chat (both the Guest `glpat-…Deploy` and the Developer one now in `deployer/.env`) and rotate to a dedicated deploy token once finished. `deployer/.env` is gitignored.
