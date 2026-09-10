import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import LoadingComponent from "@/components/app/loading-component";
import FormComponent from "@/components/form/form-component";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/permissions";
import {
	getOrganization,
	updateOrganization,
} from "@/lib/organization/functions";
import type { AnyType, FormFieldType } from "@/lib/types";
import { stringRequiredValidation } from "@/lib/validations";
import { useAuth } from "@/providers/auth-provider";

/**
 * Settings for the organization the session is currently in.
 *
 * There is no delete: every domain table holds a restricting FK to the
 * organization, so `disableOrganizationDeletion` is on — removing one would
 * either fail on that constraint or, with a cascade, hard-delete rows the app
 * only ever soft-deletes.
 */
export const Route = createFileRoute("/_private/settings/organization/")({
	beforeLoad: ({ context }) =>
		requirePermission(context.user, { organization: ["update"] }),
	component: RouteComponent,
});

const formFields: FormFieldType[][] = [
	[
		{
			name: "name",
			label: "Name",
			validationOnSubmit: stringRequiredValidation("Name"),
			placeholder: "Enter organization name",
		},
	],
	[
		{
			name: "slug",
			label: "Slug",
			validationOnSubmit: stringRequiredValidation("Slug"),
			placeholder: "Enter organization slug",
			description: "Unique across the platform.",
		},
	],
];

function RouteComponent() {
	const { user, refetch } = useAuth();

	const { data, isLoading } = useQuery({
		queryKey: ["organization", user?.organizationId],
		queryFn: () => getOrganization(),
	});

	if (isLoading) return <LoadingComponent isLoading />;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Organization</CardTitle>
				<CardDescription>
					How this organization is named across the platform.
				</CardDescription>
				<CardAction>
					{/* The switcher offers this too, but someone already in settings
					    looking at the organization they have is the other place the
					    thought "I need a different one" arrives. */}
					<Button
						variant="outline"
						render={<Link to="/settings/organization/create" />}
					>
						<Plus /> New organization
					</Button>
				</CardAction>
			</CardHeader>
			<CardContent>
				<FormComponent
					fields={formFields}
					handleSubmit={(values: AnyType) =>
						updateOrganization({ data: values })
					}
					values={data ? { name: data.name, slug: data.slug } : {}}
					// The switcher and every scoped list read the organization, so
					// re-resolve the session rather than patching one cache entry.
					onSuccess={() => refetch()}
					options={{
						isLoading,
						queryKey: "organization",
						// A page form, not a modal: clearing it on save would blank the
						// organization the user just renamed.
						keepValues: true,
						submitText: "Save changes",
					}}
				/>
			</CardContent>
		</Card>
	);
}
