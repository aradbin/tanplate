import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Landmark } from "lucide-react";
import { useRef, useState } from "react";
import LoadingComponent from "@/components/app/loading-component";
import FormComponent from "@/components/form/form-component";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authClient } from "@/lib/auth/client";
import {
	acceptInvitation,
	createOrganization,
} from "@/lib/organization/functions";
import type { AnyType, FormFieldType } from "@/lib/types";
import { slugify } from "@/lib/utils";
import { stringRequiredValidation, stringValidation } from "@/lib/validations";
import { useAuth } from "@/providers/auth-provider";

/**
 * Where someone lands with no organization to work in.
 *
 * Two ways out, and no third: accept an invitation that is already waiting, or
 * start an organization of your own. Reachable from the switcher too, which is
 * why it is not gated on having no membership.
 */
export const Route = createFileRoute("/_private/settings/organization/create/")(
	{
		component: RouteComponent,
	},
);

function RouteComponent() {
	const { refetch } = useAuth();
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	/**
	 * The slug the name has produced so far, pushed into the form through the
	 * `values` prop — the same channel an edit form uses to load a record.
	 * `slugEdited` stops it the moment someone types their own: the refill effect
	 * writes with `setFieldValue`, which does not run a field's `handleChange`, so
	 * only a real keystroke in the slug field can set it.
	 */
	const [derived, setDerived] = useState<Record<string, AnyType>>({});
	const slugEdited = useRef(false);

	const formFields: FormFieldType[][] = [
		[
			{
				name: "name",
				label: "Name",
				validationOnSubmit: stringRequiredValidation("Name"),
				placeholder: "Acme Corporation",
				handleChange: (value: string) => {
					if (!slugEdited.current) setDerived({ slug: slugify(value) });
				},
			},
		],
		[
			{
				name: "slug",
				label: "Slug",
				// Optional: derived from the name until it is typed in. Shown so it can
				// be chosen deliberately — it is unique across the deployment and ends
				// up in URLs, which is not something to have picked silently.
				validationOnSubmit: stringValidation("Slug"),
				placeholder: "acme",
				description:
					"Unique across the platform. Left blank, it follows the name.",
				// Clearing it hands the field back to the name.
				handleChange: (value: string) => {
					slugEdited.current = value !== "";
				},
			},
		],
	];

	const { data: invitations, isLoading } = useQuery({
		queryKey: ["invitations", "mine"],
		queryFn: async () => {
			const { data } = await authClient.organization.listUserInvitations();
			return data ?? [];
		},
	});

	/**
	 * Both ways in end the same: a membership now exists and the plugin has
	 * pointed the session at it, so re-resolve and go. `refetch` reads past the
	 * session cookie cache, which still names the old organization at this point.
	 */
	const enter = async () => {
		queryClient.clear();
		await refetch();
		navigate({ to: "/" });
	};

	if (isLoading) return <LoadingComponent isLoading />;

	const pending = invitations?.filter((row) => row.status === "pending") ?? [];

	return (
		<div className="flex flex-col gap-4">
			{pending.length > 0 && (
				<Card>
					<CardContent className="flex flex-col gap-3">
						<div>
							<h2 className="font-semibold">You have been invited</h2>
							<p className="text-muted-foreground text-sm">
								Accept an invitation to join an existing organization.
							</p>
						</div>
						{pending.map((invitation) => (
							<div
								key={invitation.id}
								className="flex items-center justify-between gap-2 rounded-lg border p-3"
							>
								<div className="flex items-center gap-2">
									<Landmark className="size-4" />
									<span className="truncate">
										{invitation.organizationName ?? "Organization"}
									</span>
								</div>
								<Button
									size="sm"
									onClick={async () => {
										await acceptInvitation({ data: { id: invitation.id } });
										await enter();
									}}
								>
									Accept
								</Button>
							</div>
						))}
					</CardContent>
				</Card>
			)}

			<Card>
				<CardContent className="flex flex-col gap-3">
					<div>
						<h2 className="font-semibold">Create an organization</h2>
						<p className="text-muted-foreground text-sm">
							You will be its owner, and can invite others once it exists.
						</p>
					</div>
					<FormComponent
						fields={formFields}
						values={derived}
						handleSubmit={(values: AnyType) =>
							createOrganization({ data: values })
						}
						onSuccess={enter}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
