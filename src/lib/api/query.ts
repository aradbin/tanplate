import type { QueryInputType } from "@/lib/db/types";
import { queryInputValidation } from "@/lib/validations";

/**
 * Turn a REST list request's query string into the same `QueryInputType` the web
 * transport builds from its search params, so both transports hand the services
 * an identically-shaped input.
 *
 * ```
 * ?page=2&pageSize=20&all=true      → pagination
 * ?sort=createdAt&order=asc         → sort
 * ?search=budget                    → search.term
 * ?status=draft&status=published    → where.status = ["draft", "published"]
 * ?divisionId=abc                   → where.divisionId = "abc"
 * ```
 *
 * The reserved names are the web's own, straight from
 * [`defaultSearchParamValidation`](src/lib/validations.ts) — `search`, not the
 * REST-conventional `q`. One vocabulary for both transports means a filter can
 * be copied off a browser URL into a mobile request unchanged, and it keeps
 * `search` from silently falling through into `where` as if it were a column.
 *
 * Repeated keys collapse to an array (the builders accept either). Everything
 * that isn't a reserved key becomes a `where` filter — which columns are
 * actually honoured is decided by each feature's query builder, not here.
 *
 * This is the **generic fallback**, for a feature with no search schema of its
 * own: it validates the query's shape but not its values, so an unknown filter
 * value is dropped rather than rejected. A feature that has a schema (see
 * `memoSearchValidation`) should go through `searchParamsToObject` instead and
 * get a 400 on bad input.
 */
const RESERVED = new Set([
	"page",
	"pageSize",
	"all",
	"sort",
	"order",
	"search",
]);

/** Query-string params that carry a number rather than a string. */
const NUMERIC = new Set(["page", "pageSize"]);

/** A query-string number, or `undefined` when absent or not a number. */
function numeric(value: string | null): number | undefined {
	if (value === null || value.trim() === "") return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Flatten a query string into the shape a feature's **search schema** expects —
 * the same shape TanStack hands a route's `validateSearch`, so one schema can
 * validate a browser URL and a REST request alike:
 *
 * ```ts
 * const search = memoSearchValidation.parse(searchParamsToObject(url));
 * const input = buildMemoQueryInput(search);
 * ```
 *
 * Repeated keys become arrays and `page`/`pageSize` become numbers, matching
 * what the router's own parser produces. Everything else stays a string; the
 * schema decides what is valid.
 *
 * Prefer this over `parseQueryInput` whenever the feature has a search schema —
 * it is what makes a bad filter a 400 instead of a silently dropped one.
 */
export function searchParamsToObject(url: URL): Record<string, unknown> {
	const result: Record<string, unknown> = {};

	for (const key of new Set(url.searchParams.keys())) {
		const values = url.searchParams.getAll(key);
		if (NUMERIC.has(key)) {
			result[key] = numeric(values[0]);
			continue;
		}
		result[key] = values.length > 1 ? values : values[0];
	}

	return result;
}

export function parseQueryInput(url: URL): QueryInputType {
	const params = url.searchParams;

	const where: Record<string, string | string[]> = {};
	for (const key of new Set(params.keys())) {
		if (RESERVED.has(key)) continue;
		const values = params.getAll(key);
		where[key] = values.length > 1 ? values : values[0];
	}

	const input = {
		pagination: {
			// `numberValidation` rejects strings (and `.catch()` would then silently
			// swallow the page back to 1), so the query string's numbers are widened
			// here rather than in the schema — the web transport already sends real
			// numbers through `validateSearch`.
			page: numeric(params.get("page")),
			pageSize: numeric(params.get("pageSize")),
			all: params.get("all") ?? undefined,
		},
		sort: {
			field: params.get("sort") ?? undefined,
			order: params.get("order") ?? undefined,
		},
		search: { term: params.get("search") ?? undefined },
		where,
	};

	// The same schema the web server fns validate with — a mobile client cannot
	// reach a builder through a looser gate than the browser does.
	return queryInputValidation.parse(input) as QueryInputType;
}
