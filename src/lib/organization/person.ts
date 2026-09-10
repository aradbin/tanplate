/**
 * A person as every avatar renders them.
 *
 * Identity comes from `user`, which is deliberately global; the job title is a
 * fact about the *membership*, so it lives on `member.designation`. Queries reach
 * it through the existing `user.memberships` relation rather than a join of their
 * own: `withRowGuards` confines every nested relation to the request's
 * organization, so at most one membership comes back and it is always the right
 * one. Do not use this selection inside a `runAsSystem` scope — the guard is
 * suspended there and every organization's membership would arrive.
 */
export const personSelection = {
	columns: { id: true, name: true, email: true, image: true },
	with: { memberships: { columns: { designation: true } } },
} as const;

/**
 * The two shapes a designation can arrive in: flattened onto the row by whoever
 * read it, or nested as `personSelection` selects it. Kept separate from
 * `PersonType` so `OptionType` — which allows a numeric `id` — can be read too.
 */
export type DesignationSource = {
	designation?: string | null;
	memberships?: { designation?: string | null }[] | null;
};

export type PersonType = DesignationSource & {
	id: string;
	name: string;
	email: string;
	image?: string | null;
};

/** The designation, whether it arrived flattened or through the nested membership. */
export function designationOf(
	person?: DesignationSource | null,
): string | null {
	return person?.designation ?? person?.memberships?.[0]?.designation ?? null;
}
