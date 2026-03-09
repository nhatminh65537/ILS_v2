# ILS v2 — Developer Makefile
# Usage: make <target>
# Windows users: install make via `winget install GnuWin32.Make` or use Git Bash

.PHONY: help activate migrate seed run run-ws test-backend lint-backend \
        dev-frontend test-frontend lint-frontend install-backend install-frontend

VENV_ACTIVATE := .venv/Scripts/activate
BACKEND_DIR   := backend
FRONTEND_DIR  := frontend

# ─── Help ────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "ILS v2 — Available Commands"
	@echo "───────────────────────────────────────────────"
	@echo "  Setup:"
	@echo "    make install-backend    Install Python dependencies"
	@echo "    make install-frontend   Install Node.js dependencies"
	@echo ""
	@echo "  Backend (Django):"
	@echo "    make migrate            Run database migrations"
	@echo "    make makemigrations     Create new migrations"
	@echo "    make seed               Seed default system_config values"
	@echo "    make run                Start Django dev server (HTTP)"
	@echo "    make run-ws             Start Daphne ASGI server (WebSocket)"
	@echo "    make shell              Django interactive shell"
	@echo "    make test-backend       Run pytest"
	@echo "    make test-cov           Run pytest with coverage report"
	@echo "    make lint-backend       Run ruff linter"
	@echo ""
	@echo "  Frontend (Next.js):"
	@echo "    make dev-frontend       Start Next.js dev server"
	@echo "    make build-frontend     Build for production"
	@echo "    make test-frontend      Run jest tests"
	@echo "    make lint-frontend      Run next lint"
	@echo ""

# ─── Install ─────────────────────────────────────────────────────────────────
install-backend:
	pip install -r requirements.txt

install-frontend:
	cd $(FRONTEND_DIR) && npm install

# ─── Backend ─────────────────────────────────────────────────────────────────
migrate:
	cd $(BACKEND_DIR) && python manage.py migrate

makemigrations:
	cd $(BACKEND_DIR) && python manage.py makemigrations

seed:
	cd $(BACKEND_DIR) && python manage.py seed_config

run:
	cd $(BACKEND_DIR) && python manage.py runserver

run-ws:
	cd $(BACKEND_DIR) && daphne -p 8000 backend.asgi:application

shell:
	cd $(BACKEND_DIR) && python manage.py shell

# ─── Backend Tests ───────────────────────────────────────────────────────────
test-backend:
	cd $(BACKEND_DIR) && pytest -v

test-cov:
	cd $(BACKEND_DIR) && pytest --cov=. --cov-report=term-missing --cov-report=html

lint-backend:
	cd $(BACKEND_DIR) && ruff check .

# ─── Frontend ────────────────────────────────────────────────────────────────
dev-frontend:
	cd $(FRONTEND_DIR) && npm run dev

build-frontend:
	cd $(FRONTEND_DIR) && npm run build

test-frontend:
	cd $(FRONTEND_DIR) && npm test

lint-frontend:
	cd $(FRONTEND_DIR) && npm run lint
