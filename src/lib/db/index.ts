import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import * as relations from "./relations.ts";
import * as schema from "./schema/index.ts";

const pool = new Pool({ connectionString: env.DATABASE_URL, max: 10 });
export const db = drizzle({
	client: pool,
	schema: { ...schema, ...relations },
});
