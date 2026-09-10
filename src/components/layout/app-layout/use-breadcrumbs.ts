import { type QueryKey, skipToken, useQueries } from "@tanstack/react-query";
import { useMatches } from "@tanstack/react-router";
import { useMemo } from "react";
import type { AnyType } from "@/lib/types";

export type BreadcrumbType = {
	title: string;
	href: string;
	/** The raw decoded segment, kept for the tooltip once the label is truncated. */
	full: string;
	/** True when the segment is a route param value rather than a route name. */
	isDynamic: boolean;
	/** True when a dynamic segment was named from cache instead of shown raw. */
	isResolved: boolean;
};

type CrumbSource = {
	queryKey: (value: string) => QueryKey;
	label: (data: AnyType) => string | undefined;
};

/**
 * How to name a dynamic segment, keyed by the segment *preceding* it
 * (`/settings/members/<email>` -> `members`).
 *
 * The keys are the ones the destination page already reads, so a crumb is named
 * from a cache entry that page owns rather than from a lookup of its own. An
 * entity missing from this map is not a failure — its crumb falls back to the
 * raw segment. A feature that adds a detail route (`/<entity>/$id`) registers
 * its page's query key here to get a readable crumb.
 */
const crumbSources: Record<string, CrumbSource> = {
	members: {
		queryKey: (email) => ["member", email],
		label: (member) => member?.user?.name,
	},
};

function pathToTitle(segment: string): string {
	return segment
		.split(/[-_]/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

type RawCrumb = Omit<BreadcrumbType, "isResolved"> & { source?: CrumbSource };

/**
 * The crumb trail for the current location: one entry per URL segment, dynamic
 * segments named from cache where possible.
 */
export function useBreadcrumbs(): BreadcrumbType[] {
	const matches = useMatches();

	const crumbs = useMemo(() => {
		// The deepest match carries every param in the tree, which is the router's
		// own answer to "which segments are data rather than route names" — exact
		// for ids, emails and any param shape added later, where matching a pattern
		// against the segment could only ever guess.
		const paramValues = new Set(
			Object.values(matches.at(-1)?.params ?? {}).map(String),
		);

		const result: RawCrumb[] = [];

		matches.forEach((match) => {
			const pathSegments = match.pathname.split("/").filter(Boolean);

			pathSegments.forEach((segment, index) => {
				const href = `/${pathSegments.slice(0, index + 1).join("/")}`;
				if (result.some((crumb) => crumb.href === href)) return;

				const full = decodeURIComponent(segment);
				const isDynamic = paramValues.has(full);

				result.push({
					href,
					full,
					isDynamic,
					// A param holds user data, so title-casing it would corrupt it.
					title: isDynamic ? full : pathToTitle(full),
					source:
						isDynamic && index > 0
							? crumbSources[pathSegments[index - 1]]
							: undefined,
				});
			});
		});

		return result;
	}, [matches]);

	const resolvable = crumbs.filter(
		(crumb): crumb is RawCrumb & { source: CrumbSource } => !!crumb.source,
	);

	// `skipToken` disables fetching outright while the observer still subscribes
	// to the cache, so a crumb costs no request yet still flips from the raw id to
	// the real name the moment the page's own query lands. `getQueryData` would be
	// a dead snapshot that never updates.
	const labels = useQueries({
		queries: resolvable.map((crumb) => ({
			queryKey: crumb.source.queryKey(crumb.full),
			queryFn: skipToken,
			select: crumb.source.label,
		})),
	});

	const resolved = new Map<string, string>();
	resolvable.forEach((crumb, index) => {
		const label = labels[index]?.data;
		if (label) resolved.set(crumb.href, label);
	});

	return crumbs.map((crumb) => {
		const label = resolved.get(crumb.href);
		return {
			title: label ?? crumb.title,
			href: crumb.href,
			full: crumb.full,
			isDynamic: crumb.isDynamic,
			isResolved: !!label,
		};
	});
}
