#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Drobe bootstrap. Run once after cloning to get a working local environment.
# Idempotent: safe to re-run.
# ---------------------------------------------------------------------------
set -euo pipefail

echo "==> Checking prerequisites"
command -v node >/dev/null || { echo "Node 20+ required"; exit 1; }
command -v pnpm >/dev/null || { echo "pnpm required: npm i -g pnpm"; exit 1; }

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then echo "Node 20+ required (have $(node -v))"; exit 1; fi

echo "==> Installing workspace dependencies"
pnpm install

echo "==> Setting up environment"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "    Created .env from .env.example — edit DATABASE_URL if not using local Postgres."
else
  echo "    .env already exists, leaving it alone."
fi

echo "==> Generating Prisma client"
pnpm db:generate

cat <<'NEXT'

Done. Next steps:
  1. Make sure Postgres is running and DATABASE_URL in .env is correct.
       (Local quickstart: docker run --name drobe-pg -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_DB=drobe -p 5432:5432 -d postgres:16)
  2. Push the schema and seed:
       pnpm db:push && pnpm db:seed
  3. Start everything:
       pnpm dev
     Web  -> http://localhost:3000
     API  -> http://localhost:4000/health

Exercise the API while auth is stubbed (pass any seeded user id):
  curl -H "x-user-id: <USER_ID>" http://localhost:4000/items
NEXT
