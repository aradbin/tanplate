import {
	createFileRoute,
	Outlet,
	redirect,
	useLocation,
} from "@tanstack/react-router";
import { ShieldUser } from "lucide-react";
import FullPageComponent from "@/components/app/full-page-component";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const titles: Record<string, string> = {
	"/login": "Login",
	"/register": "Register",
	"/verify": "Verify Email",
	"/password/forgot": "Forgot Password",
	"/password/reset": "Reset Password",
};

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
	const { pathname } = useLocation();
	const title = titles[pathname] ?? "Login";

	return (
		<FullPageComponent>
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-center gap-2">
						<div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
							<ShieldUser className="size-4" />
						</div>
						{title}
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
