#!/usr/bin/env bash
set -euo pipefail

echo "==> Starting test containers..."
docker compose -f docker-compose.test.yml up -d --wait

# Ensure cleanup on script exit
cleanup() {
  echo "==> Tearing down test containers..."
  docker compose -f docker-compose.test.yml down
}
trap cleanup EXIT

# We need to set the database URL and Redis URL for the backend to use the test instances
export DATABASE_URL="postgresql://testuser:testpassword@localhost:5433/testdb"
export REDIS_URL="redis://localhost:6380"

echo "==> Running database migrations..."
npm run migration:run --workspace=apps/backend

echo "==> Running integration tests..."
npm run test:integration --workspace=apps/backend

echo "==> Integration tests completed successfully."
