SHELL := /bin/bash
.PHONY: dev backend frontend install test seed

BACKEND_DIR := backend
FRONTEND_DIR := frontend
VENV := $(BACKEND_DIR)/.venv/bin

dev:
	@trap 'kill 0' INT; \
	$(VENV)/uvicorn app.main:app --reload --app-dir $(BACKEND_DIR) & \
	npm --prefix $(FRONTEND_DIR) run dev & \
	wait

backend:
	$(VENV)/uvicorn app.main:app --reload --app-dir $(BACKEND_DIR)

frontend:
	npm --prefix $(FRONTEND_DIR) run dev

install:
	$(VENV)/pip install -q -r $(BACKEND_DIR)/requirements.txt
	npm --prefix $(FRONTEND_DIR) install

test:
	cd $(BACKEND_DIR) && .venv/bin/pytest tests/ -v

seed:
	cd $(BACKEND_DIR) && .venv/bin/python scripts/seed.py
