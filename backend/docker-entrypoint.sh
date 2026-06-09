#!/bin/sh
# ILS v2 backend container entrypoint.
#
# Django's AppConfig.ready() (auth_app) touches the DB on import, so the database
# MUST be reachable before any management command runs. We therefore:
#   1. wait for Postgres TCP to accept connections,
#   2. run migrations,
#   3. seed canonical system_config + built-in roles,
#   4. (optionally) bootstrap a first admin user,
#   5. collect static files,
#   6. exec Daphne (ASGI — serves both HTTP and WebSocket).
set -e

DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"

# Only wait when we're actually talking to a networked DB (Postgres). With the
# SQLite fallback (no DB_ENGINE) there's nothing to wait for.
if [ -n "${DB_ENGINE:-}" ]; then
  echo "[entrypoint] waiting for database ${DB_HOST}:${DB_PORT} ..."
  # Pure-Python TCP probe (no nc/pg_isready in the slim image).
  until python -c "import socket,sys; s=socket.socket(); s.settimeout(2); \
sys.exit(0) if s.connect_ex(('${DB_HOST}', ${DB_PORT}))==0 else sys.exit(1)" 2>/dev/null; do
    echo "[entrypoint] database not ready yet, retrying in 2s ..."
    sleep 2
  done
  echo "[entrypoint] database is up."
fi

echo "[entrypoint] applying migrations ..."
python manage.py migrate --noinput

echo "[entrypoint] seeding system_config ..."
python manage.py seed_config

echo "[entrypoint] seeding built-in roles ..."
python manage.py seed_roles

# Optional first-admin bootstrap. Enable by setting SEED_ADMIN=true. Credentials
# come from ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_EMAIL (seed_admin is idempotent).
if [ "${SEED_ADMIN:-false}" = "true" ]; then
  echo "[entrypoint] seeding admin user ..."
  python manage.py seed_admin \
    --username "${ADMIN_USERNAME:-admin}" \
    --email "${ADMIN_EMAIL:-admin@example.com}"
fi

echo "[entrypoint] collecting static files ..."
python manage.py collectstatic --noinput

echo "[entrypoint] starting Daphne on 0.0.0.0:8000 ..."
exec daphne -b 0.0.0.0 -p 8000 backend.asgi:application
