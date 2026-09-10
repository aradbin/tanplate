#!/bin/sh
set -e

# `depends_on: service_healthy` doesn't guarantee this container can resolve `db`
# yet — Docker's embedded DNS can briefly return ENOTFOUND right after the network
# is created. Gate everything below on a real connection first.
echo "→ Waiting for database..."
node scripts/wait-for-db.mjs

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
	echo "→ Applying database migrations (drizzle-kit migrate)..."
	# Retried for a blip mid-run; safe because drizzle-kit skips migrations already
	# recorded in the journal.
	attempt=1
	until ./node_modules/.bin/drizzle-kit migrate; do
		if [ "$attempt" -ge 3 ]; then
			echo "  migrate: failed after $attempt attempts"
			exit 1
		fi
		attempt=$((attempt + 1))
		echo "  migrate: retrying (attempt $attempt)..."
		sleep 2
	done
fi

# Bootstraps the first owner and their organization on a fresh database.
# Idempotent; no-ops unless SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD are set.
echo "→ Seeding admin user..."
node scripts/seed-admin.mjs

echo "→ Starting server on ${HOST:-0.0.0.0}:${PORT:-3000}"
exec node .output/server/index.mjs
