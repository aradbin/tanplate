/**
 * Blocks until the database answers a trivial query.
 *
 * `depends_on: db: service_healthy` proves Postgres is accepting connections, but not
 * that this container can resolve the `db` service name yet: Docker's embedded resolver
 * registers names asynchronously, so the first lookup right after the network is created
 * can fail with `ENOTFOUND db`. Without this gate a single blip kills `drizzle-kit
 * migrate` under `set -e` and the container crash-loops.
 *
 * Plain `.mjs` on purpose — the runner image has no TypeScript toolchain and no app
 * bundle, only `pg` plus Node builtins (same constraint as `seed-admin.mjs`).
 */

import pg from "pg";

const TIMEOUT_MS = Number(process.env.DB_WAIT_TIMEOUT_MS ?? 60_000);
const INTERVAL_MS = Number(process.env.DB_WAIT_INTERVAL_MS ?? 1_000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function probe() {
	const client = new pg.Client({
		connectionString: process.env.DATABASE_URL,
		// Below the retry interval, so a hung TCP connect fails fast and is retried
		// rather than eating the whole timeout budget in one attempt.
		connectionTimeoutMillis: 5_000,
	});
	try {
		await client.connect();
		await client.query("select 1");
	} finally {
		// Always release, or the process lingers instead of exiting to the entrypoint.
		await client.end().catch(() => {});
	}
}

async function main() {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL is not set");
	}

	const deadline = Date.now() + TIMEOUT_MS;
	let attempt = 0;
	let lastError;

	while (Date.now() < deadline) {
		attempt++;
		try {
			await probe();
			console.log(`  wait-for-db: database ready (attempt ${attempt})`);
			return;
		} catch (error) {
			lastError = error;
			const code = error.code ? `${error.code}: ` : "";
			console.log(`  wait-for-db: attempt ${attempt} — ${code}${error.message}`);
			await sleep(INTERVAL_MS);
		}
	}

	throw new Error(
		`database unreachable after ${TIMEOUT_MS}ms (${attempt} attempts) — ${lastError?.message}`,
	);
}

main().catch((error) => {
	console.error(`  wait-for-db: failed — ${error.message}`);
	process.exit(1);
});
