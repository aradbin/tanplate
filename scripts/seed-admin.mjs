/**
 * Seeds the initial admin user.
 *
 * A fresh database has no admin, and every route is gated behind `requirePermission`
 * — so there is no in-app way to create the first one. This runs from
 * `docker-entrypoint.sh` right after migrations and closes that gap.
 *
 * Idempotent and opt-in: it no-ops when `SEED_ADMIN_*` is unset, and never touches an
 * email that already exists.
 *
 * Plain `.mjs` on purpose — the runner image has no TypeScript toolchain and no app
 * bundle, only `pg` plus Node builtins.
 */

import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const scryptAsync = promisify(scrypt);

/**
 * Must stay byte-identical to better-auth's hasher (`@better-auth/utils/password`),
 * otherwise the seeded row exists but can never log in. Verified against that
 * package's `verifyPassword`.
 */
const SCRYPT = { N: 16384, r: 16, p: 1, dkLen: 64 };

/** Note: the hex salt is fed to scrypt as a *string*, not decoded back to bytes. */
async function hashPassword(password) {
	const salt = randomBytes(16).toString("hex");
	const key = await scryptAsync(password.normalize("NFKC"), salt, SCRYPT.dkLen, {
		N: SCRYPT.N,
		r: SCRYPT.r,
		p: SCRYPT.p,
		maxmem: 128 * SCRYPT.N * SCRYPT.r * 2,
	});
	return `${salt}:${key.toString("hex")}`;
}

/** 32-char alphanumeric, matching the id shape better-auth generates. */
function generateId() {
	const alphabet =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const bytes = randomBytes(32);
	let id = "";
	for (const byte of bytes) id += alphabet[byte % alphabet.length];
	return id;
}

async function main() {
	const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
	const password = process.env.SEED_ADMIN_PASSWORD;
	const name = process.env.SEED_ADMIN_NAME?.trim() || "Admin";

	if (!email || !password) {
		console.log("  seed-admin: SEED_ADMIN_EMAIL/PASSWORD not set — skipped");
		return;
	}
	// Mirrors `minPasswordLength` in src/lib/auth/config.ts, so we never create an
	// account the app itself would reject on reset.
	if (password.length < 8) {
		throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters");
	}
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL is not set");
	}

	const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

	try {
		const existing = await pool.query(
			'select id, role from "user" where email = $1',
			[email],
		);
		if (existing.rowCount > 0) {
			// Deliberately left untouched: silently promoting a self-registered account
			// to admin is a worse failure mode than doing nothing. Promote by hand.
			const { role } = existing.rows[0];
			console.log(
				`  seed-admin: ${email} already exists (role=${role}) — left unchanged`,
			);
			return;
		}

		const client = await pool.connect();
		try {
			await client.query("begin");

			const userId = generateId();
			// ON CONFLICT guards the race where someone registers this email between
			// the SELECT above and this INSERT.
			const inserted = await client.query(
				`insert into "user" (id, name, email, email_verified, role, banned)
				 values ($1, $2, $3, true, 'admin', false)
				 on conflict (email) do nothing
				 returning id`,
				[userId, name, email],
			);
			if (inserted.rowCount === 0) {
				await client.query("rollback");
				console.log(
					`  seed-admin: ${email} was created concurrently — left unchanged`,
				);
				return;
			}

			// better-auth looks up credentials by provider_id='credential'; for these
			// accounts account_id equals the user id.
			await client.query(
				`insert into account (id, account_id, provider_id, user_id, password)
				 values ($1, $2, 'credential', $2, $3)`,
				[generateId(), userId, await hashPassword(password)],
			);

			await client.query("commit");
			console.log(`  seed-admin: created admin ${email}`);
		} catch (error) {
			await client.query("rollback");
			throw error;
		} finally {
			client.release();
		}
	} finally {
		// Always release the pool, or the entrypoint hangs instead of exec'ing the server.
		await pool.end();
	}
}

main().catch((error) => {
	console.error(`  seed-admin: failed — ${error.message}`);
	process.exit(1);
});
