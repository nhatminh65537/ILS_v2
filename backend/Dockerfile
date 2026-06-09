# ILS v2 backend — Django + DRF + Channels, served by Daphne (ASGI).
# Build context is the REPO ROOT (so we can copy the root requirements.txt and the
# backend/ source). See the root docker-compose.yml `backend` service.
FROM python:3.12-slim

# - PYTHONUNBUFFERED: stream logs straight to the container output (no buffering).
# - PYTHONDONTWRITEBYTECODE: skip .pyc files in the image.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# psycopg2-binary ships manylinux wheels, so no libpq build deps are needed.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the Django project (the build context is the repo root).
COPY backend/ ./

# Normalise line endings (repo is edited on Windows) and make the entrypoint runnable.
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]
