import { Link } from "@tanstack/react-router";
import { Drill } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";

export default function ComingSoonComponent() {
	return (
		<Empty className="border border-dashed py-20">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<Drill />
				</EmptyMedia>
				<EmptyTitle>Coming Soon</EmptyTitle>
				<EmptyDescription>
					We're working hard to bring this feature to you. Stay tuned!
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
