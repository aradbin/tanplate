#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
	echo "→ Applying database migrations (drizzle-kit migrate)..."
	./node_modules/.bin/drizzle-kit migrate
fi

# Bootstraps the first admin on a fresh database. Idempotent; no-ops unless
# SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD are set.
echo "→ Seeding admin user..."
node scripts/seed-admin.mjs

echo "→ Starting server on ${HOST:-0.0.0.0}:${PORT:-3000}"
exec node .output/server/index.mjs
