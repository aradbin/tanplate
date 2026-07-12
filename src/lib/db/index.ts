import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "@/lib/env";
import * as relations from "./relations.ts";
import * as schema from "./schema/index.ts";

export const db = drizzle(env.DATABASE_URL, {
	schema: { ...schema, ...relations },
});
