import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SettingsNav } from "./-settings-nav";

/**
 * The settings shell: the section nav beside whichever section is open.
 *
 * No guard of its own — every child carries the `requirePermission` its own page
 * needs, and `organization/create` deliberately carries none.
 */
export const Route = createFileRoute("/_private/settings")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="flex flex-col gap-4 md:flex-row">
			<SettingsNav />
			<div className="min-w-0 flex-1">
				<Outlet />
			</div>
		</div>
	);
}
