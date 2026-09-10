/**
 * Seeds the initial admin user and the organization they own.
 *
 * Permissions come from an organization membership, so a fresh deployment needs
 * one organization with an `owner` before anyone can administer anything. This
 * runs from `docker-entrypoint.sh` right after migrations and closes that gap.
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
	// An account with no membership has no role and no tenant, so it would sign in
	// straight onto the onboarding page. Seed an organization for it to own.
	const orgName = process.env.SEED_ORG_NAME?.trim() || "Tanplate";
	const orgSlug = process.env.SEED_ORG_SLUG?.trim().toLowerCase() || "tanplate";

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
			'select id from "user" where email = $1',
			[email],
		);
		if (existing.rowCount > 0) {
			// Deliberately left untouched: silently handing a self-registered account
			// ownership of an organization is a worse failure mode than doing nothing.
			console.log(`  seed-admin: ${email} already exists — left unchanged`);
			return;
		}

		const client = await pool.connect();
		try {
			await client.query("begin");

			const userId = generateId();
			// ON CONFLICT guards the race where someone registers this email between
			// the SELECT above and this INSERT.
			const inserted = await client.query(
				`insert into "user" (id, name, email, email_verified)
				 values ($1, $2, $3, true)
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

			// Permissions come from the membership, never from the account, so the
			// organization and the `owner` row are what actually make this login
			// useful — without them it signs in with no role and nothing to see.
			const created = await client.query(
				`insert into organization (id, name, slug, created_by)
				 values ($1, $2, $3, $4)
				 on conflict (slug) do nothing
				 returning id`,
				[generateId(), orgName, orgSlug, userId],
			);
			const organizationId =
				created.rows[0]?.id ??
				(
					await client.query("select id from organization where slug = $1", [
						orgSlug,
					])
				).rows[0].id;

			await client.query(
				`insert into member (id, organization_id, user_id, role, created_by)
				 values ($1, $2, $3, 'owner', $3)`,
				[generateId(), organizationId, userId],
			);

			await client.query("commit");
			console.log(
				`  seed-admin: created ${email} as owner of ${orgName} (${orgSlug})`,
			);
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
