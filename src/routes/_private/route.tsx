import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import AppLayout from "@/components/layout/app-layout";
import Modals from "@/components/layout/modals";
import { AppProvider } from "@/providers/app-provider";

export const Route = createFileRoute("/_private")({
	beforeLoad: ({ context, location }) => {
		if (!context?.user) {
			throw redirect({
				to: "/login",
				search: { redirect: location.href },
			});
		}

		// Signed in, but with nothing to be signed in *to*: no membership means no
		// role and no tenant, so every list would be empty and every write would be
		// refused by the builders. Send them somewhere they can act instead.
		if (
			!context.user.organizationId &&
			!location.pathname.startsWith("/settings/organization/create")
		) {
			throw redirect({ to: "/settings/organization/create" });
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<AppProvider>
			<AppLayout>
				<div className="@container/main flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6">
					<Outlet />
				</div>
				<Modals />
			</AppLayout>
		</AppProvider>
	);
}
