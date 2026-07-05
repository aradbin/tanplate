import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { ShieldUser } from "lucide-react";
import FullPageComponent from "@/components/app/full-page-component";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_auth")({
	beforeLoad: ({ context }) => {
		if (context?.user) {
			throw redirect({
				to: "/",
			});
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<FullPageComponent>
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-center gap-2">
						<div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
							<ShieldUser className="size-4" />
						</div>
						Login
					</CardTitle>
				</CardHeader>
				<Separator />
				<CardContent>
					<div className="w-full min-w-xs md:min-w-sm space-y-4">
						<Outlet />
					</div>
				</CardContent>
			</Card>
		</FullPageComponent>
	);
}
