import { ShieldAlert, ShieldBan, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/lib/db/schema";

export default function UserStatusBadge({ user }: { user: User }) {
	const status = user.emailVerified
		? user.banned
			? "Banned"
			: "Active"
		: "Not Verified";

	const icon = user.emailVerified ? (
		user.banned ? (
			<ShieldBan />
		) : (
			<ShieldCheck />
		)
	) : (
		<ShieldAlert />
	);

	const variant = user.emailVerified
		? user.banned
			? "destructive"
			: "default"
		: "outline";

	return (
		<Badge variant={variant} className="min-w-20">
			{icon}
			{status}
		</Badge>
	);
}
