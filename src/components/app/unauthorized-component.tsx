import { Link } from "@tanstack/react-router";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";

export default function UnauthorizedComponent() {
	return (
		<Empty className="absolute w-3/4 max-w-200 top-10 border border-dashed py-20">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<ShieldOff />
				</EmptyMedia>
				<EmptyTitle>Access Denied</EmptyTitle>
				<EmptyDescription>
					You don't have permission to view this page
				</EmptyDescription>
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
