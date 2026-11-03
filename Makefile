SHELL := /bin/bash
.PHONY: dev backend frontend install install-backend install-frontend migrate seed test docker-build docker-up docker-down

BACKEND_DIR := backend
FRONTEND_DIR := frontend
VENV := $(BACKEND_DIR)/.venv

install-backend:
	@test -d $(VENV) || python3 -m venv $(VENV)
	$(VENV)/bin/pip install -q -r $(BACKEND_DIR)/requirements.txt

install-frontend:
	npm --prefix $(FRONTEND_DIR) install

install: install-backend install-frontend

migrate:
	cd $(BACKEND_DIR) && .venv/bin/alembic upgrade head

seed:
	cd $(BACKEND_DIR) && .venv/bin/python scripts/seed.py

dev:
	@trap 'kill 0' INT; \
	cd $(BACKEND_DIR) && .venv/bin/uvicorn app.main:app --reload & \
	npm --prefix $(FRONTEND_DIR) run dev & \
	wait

backend:
	cd $(BACKEND_DIR) && .venv/bin/uvicorn app.main:app --reload

frontend:
	npm --prefix $(FRONTEND_DIR) run dev

test:
	cd $(BACKEND_DIR) && .venv/bin/pytest tests/ -v

docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down
