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

export default function ErrorComponent() {
	return (
		<Empty className="border border-dashed py-20">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<Ban />
				</EmptyMedia>
				<EmptyTitle>Ooops</EmptyTitle>
				<EmptyDescription>
					Something went wrong. Please try again later
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
