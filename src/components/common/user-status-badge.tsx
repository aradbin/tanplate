import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/lib/db/schema";

/**
 * Whether a person has proved their email address.
 *
 * Account status is deliberately all this shows: an organization revokes
 * membership, never the account, so "removed" is a fact about a `member` row and
 * has no place on the user.
 */
export default function UserStatusBadge({
	user,
}: {
	user: Pick<User, "emailVerified">;
}) {
	return (
		<Badge
			variant={user.emailVerified ? "default" : "outline"}
			className="min-w-20"
		>
			{user.emailVerified ? <ShieldCheck /> : <ShieldAlert />}
			{user.emailVerified ? "Active" : "Not Verified"}
		</Badge>
	);
}
