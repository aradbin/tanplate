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
