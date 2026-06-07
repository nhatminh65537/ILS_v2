# Baby File Reader — sample deployable challenge

A minimal Flask service with a path-traversal vulnerability, used to demonstrate the
ILS per-user instance deploy flow. When a player launches an instance, the deploy
server runs this image with their unique `FLAG` injected as an env var. The player must
exploit `/read?file=` to read `/secret/flag.txt` and recover *their* flag.

> This README is imported into the challenge description when ILS syncs from GitLab.

## Repo layout (the deployable-challenge format)

| File | Role |
|------|------|
| `Dockerfile` | Builds the service. `EXPOSE 5000` tells the deploy server which port to publish. Reads `FLAG` from env at run time. |
| `app.py` | The vulnerable Flask app. |
| `requirements.txt` | App dependencies. |
| `.gitlab-ci.yml` | Builds + pushes the image to the GitLab Container Registry on the default branch. |
| `challenge.yml` | Metadata (documentation-only in MVP). |
| `README.md` | Imported as the challenge description. |

## How to use as a template

1. Copy this directory into a new GitLab project under your `challenges/` group.
2. Edit `app.py` / `Dockerfile` for your challenge (keep `EXPOSE` and the `FLAG` env contract).
3. Push to the default branch — CI builds and pushes `…/<project>:latest` to the registry.
4. In ILS, import/create the challenge from GitLab. `deploy_source_ref` is prefilled to
   `registry.<gitlab-host>/<group>/<project>:latest`; adjust if needed.
5. Add a `ChallengeFlag` with `random_tail_length > 0` to enable per-user instance flags.
6. Enable deploy (`challenge.deploy.enabled=true`, `provider=socket`) and launch an instance.

## Exploit (for testing)

```
GET /read?file=/secret/flag.txt   →   ILS{baby_file_reader_<random>}
```
