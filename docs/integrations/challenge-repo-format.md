# Deployable Challenge Repo Format

> **Status:** Stable (Task 6.9)
> Defines what a GitLab challenge repository must contain so ILS can import it and the
> deploy server can spawn per-user instances. A ready-to-copy template lives in
> [`examples/challenge-template/`](../../examples/challenge-template/).

## Why a format

ILS imports challenge metadata + attachments from GitLab (Task 6.8) and resolves a
**deploy image** per challenge. For deployable challenges, the repo's CI builds a Docker
image and pushes it to the GitLab Container Registry; the deploy server pulls that image
to run instances. Standardising the layout keeps `deploy_source_ref` predictable and the
deploy contract (port, flag injection) consistent.

## Required files

| File | Required | Role |
|------|----------|------|
| `Dockerfile` | for deployable | Builds the service. **`EXPOSE <port>`** declares the container port the deploy server publishes. Service must read the flag from the **`FLAG`** env var. |
| `.gitlab-ci.yml` | for deployable | Builds and pushes the image to `$CI_REGISTRY_IMAGE:latest` on the default branch. |
| `README.md` | recommended | Imported as the challenge description. |
| `challenge.yml` | optional | Metadata (documentation-only — not parsed by ILS in MVP). |
| `attachment.zip` (or other files) | optional | Player-facing downloads imported as `ChallengeFile`s. |

## The deploy contract

1. **Port** — the Dockerfile `EXPOSE`s exactly one port (the service port). The deploy
   server reads it from image metadata and maps it to a random host port. ILS does not
   send a port.
2. **Flag** — the service reads its flag from the `FLAG` env var. ILS generates a unique
   per-user flag and the deploy server injects it as `FLAG` at run time. The challenge
   must surface the flag only by being exploited (not print it on the index page).
3. **Image ref** — CI pushes `$CI_REGISTRY_IMAGE:latest`, i.e.
   `registry.<gitlab-host>/<group>/<project>:latest`. This is exactly what ILS prefills
   into `Challenge.deploy_source_ref` from the imported `gitlab_path`.

## Image naming → `deploy_source_ref`

```
gitlab_path        = challenges/baby-file-reader
registry host      = registry.<gitlab-host>     (e.g. registry.gitlab.n3m3s1s.org)
deploy_source_ref  = registry.gitlab.n3m3s1s.org/challenges/baby-file-reader:latest
```

ILS computes this default at create/import time; an editor can override it (e.g. a pinned
tag or a different registry).

## Registry access

- **Public images:** no auth needed; the deploy server pulls directly.
- **Private images (default for self-hosted):** the deploy server authenticates with a
  GitLab access token (scope `read_registry`) via `DEPLOY_REGISTRY_USER` /
  `DEPLOY_REGISTRY_TOKEN`. The token lives only on the deploy server, never in ILS.

## Related

- `docs/integrations/deploy-socket-protocol.md` — the ILS↔deploy-server wire contract
- `examples/challenge-template/` — copyable template
- `deployer/README.md` — running the deployer
