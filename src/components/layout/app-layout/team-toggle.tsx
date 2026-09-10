import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronsUpDown, Landmark, Plus } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import {
	listOrganizations,
	setActiveOrganization,
} from "@/lib/organization/functions";
import { useAuth } from "@/providers/auth-provider";

/**
 * The organization switcher.
 *
 * Switching changes what every query in the app returns, so it clears the React
 * Query cache rather than invalidating it: entries keyed only by entity would
 * otherwise be served from the previous organization on the first paint. The
 * `refetch` then re-resolves the session past the cookie cache, which still names
 * the organization we just left.
 */
export default function TeamToggle() {
	const { user, refetch } = useAuth();
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const { data: organizations } = useQuery({
		queryKey: ["organizations", "mine"],
		queryFn: () => listOrganizations(),
	});

	const active = organizations?.find((org) => org.id === user?.organizationId);

	/**
	 * Re-resolve before navigating: `refetch` is what reads past the session
	 * cookie cache and rewrites it, so the dashboard's queries would otherwise
	 * resolve against a session still naming the organization we just left.
	 * `replace` drops the page we were on — it belongs to that organization and
	 * would not resolve any more.
	 */
	const select = async (organizationId: string) => {
		if (organizationId === user?.organizationId) return;

		await setActiveOrganization({ data: { organizationId } });
		queryClient.clear();
		await refetch();
		navigate({ to: "/", replace: true });
	};

	return (
		<DropdownMenu>
			{/* `render` is the element, `children` are its content — Base UI merges the
          two. */}
			<DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
				<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
					<Landmark className="size-4" />
				</div>
				<div className="grid flex-1 text-left text-sm leading-tight">
					<span className="truncate font-semibold">
						{active?.name ?? "No organization"}
					</span>
				</div>
				<ChevronsUpDown className="ml-auto size-4" />
			</DropdownMenuTrigger>
			<DropdownMenuContent className="min-w-56" align="start">
				{/* `DropdownMenuLabel` is Base UI's `Menu.GroupLabel`, so it labels a
            group and throws without one to label. */}
				<DropdownMenuGroup>
					<DropdownMenuLabel className="text-muted-foreground text-xs">
						Organizations
					</DropdownMenuLabel>
					{organizations?.map((organization) => (
						<DropdownMenuItem
							key={organization.id}
							onClick={() => select(organization.id)}
						>
							<Landmark />
							<span className="truncate">{organization.name}</span>
							{organization.id === user?.organizationId && (
								<Check className="ml-auto size-4" />
							)}
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={() => navigate({ to: "/settings/organization/create" })}
				>
					<Plus />
					Create organization
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
