import { type AnyColumn, sql } from "drizzle-orm";

/**
 * One column of a subquery-local alias, as an identifier pair (`"mvu"."user_id"`).
 *
 * Deliberately **not** a Drizzle column handle (`alias(t, "mvu").userId`): the
 * relational query builder rewrites every `Column` it finds in a caller's `where`
 * to the *root* table's alias, so those handles silently compile to a column of
 * the queried table and break it. Emitting an identifier keeps the mapper out of
 * it, while taking the name off the real schema column keeps a rename a compile
 * error rather than a predicate that quietly stops matching.
 *
 * Every custom `BuilderOptions.conditions` fragment that reaches another table
 * needs this. It lives apart from the builders — which open a connection pool on
 * import — so a module can use it without pulling the database in.
 */
export const col = (tableAlias: string, column: AnyColumn) =>
	sql`${sql.identifier(tableAlias)}.${sql.identifier(column.name)}`;
