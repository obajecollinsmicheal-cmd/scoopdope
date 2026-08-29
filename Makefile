.PHONY: help dev test lint migrate build-contracts docker-up docker-down

help:
	@echo "Available commands:"
	@echo "  make help            - Show this help message"
	@echo "  make dev             - Start backend and frontend in development mode"
	@echo "  make test            - Run all tests (backend, frontend, contracts)"
	@echo "  make lint            - Run linter on all apps"
	@echo "  make migrate         - Run database migrations for the backend"
	@echo "  make build-contracts - Build all smart contracts"
	@echo "  make docker-up       - Start PostgreSQL and Redis via Docker Compose"
	@echo "  make docker-down     - Stop and remove Docker Compose services"

dev:
	@echo "==> Starting backend and frontend..."
	npm run dev:backend & npm run dev:frontend

test:
	@echo "==> Running backend tests..."
	npm run test --workspace=apps/backend
	@echo "==> Running frontend tests..."
	npm run test --workspace=apps/frontend || true
	@echo "==> Running contract tests..."
	cargo test

lint:
	@echo "==> Running lint checks..."
	npm run lint --workspace=apps/backend
	npm run lint --workspace=apps/frontend

migrate:
	@echo "==> Running database migrations..."
	npm run migration:run --workspace=apps/backend

build-contracts:
	@echo "==> Building smart contracts..."
	./scripts/build.sh

docker-up:
	@echo "==> Starting PostgreSQL and Redis..."
	docker compose up -d postgres redis

docker-down:
	@echo "==> Stopping Docker services..."
	docker compose down
