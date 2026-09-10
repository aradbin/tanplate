import { Link } from "@tanstack/react-router";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";

/**
 * The generic "something failed" page. `description` lets a route that knows *why*
 * say so — a loader rejecting on a domain rule (`AppError`) carries a message
 * written for the user, the same one the RPC client would have shown in a toast.
 */
export default function ErrorComponent({
	description = "Something went wrong. Please try again later",
}: {
	description?: string;
}) {
	return (
		<Empty className="absolute w-3/4 max-w-200 top-10 border border-dashed py-20">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<Ban />
				</EmptyMedia>
				<EmptyTitle>Ooops</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<div className="flex gap-2">
					<Link to="/">
						<Button variant="outline">Back to Home</Button>
					</Link>
				</div>
			</EmptyContent>
		</Empty>
	);
}
