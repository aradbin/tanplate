import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import FormComponent from "@/components/form/form-component";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { resetPassword } from "@/lib/auth/functions";
import type { FormFieldType } from "@/lib/types";
import {
	passwordRequiredValidation,
	stringValidation,
	validate,
} from "@/lib/validations";

export const Route = createFileRoute("/_auth/password/reset/")({
	validateSearch: validate({
		token: stringValidation("Token", Infinity).catch(undefined),
		error: stringValidation("Error", Infinity).catch(undefined),
	}),
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();
	const { token, error } = Route.useSearch();

	const fields: FormFieldType[][] = [
		[
			{
				name: "newPassword",
				label: "New Password",
				type: "password",
				validationOnSubmit: passwordRequiredValidation("New password"),
				placeholder: "••••••••",
			},
		],
		[
			{
				name: "confirmPassword",
				label: "Confirm New Password",
				type: "password",
				validationOnSubmit: passwordRequiredValidation("Confirm password"),
				placeholder: "••••••••",
			},
		],
	];

	if (error || !token) {
		return (
			<div className="space-y-4">
				<Alert variant="destructive" className="border-destructive">
					<AlertCircle className="size-4" />
					<AlertTitle>
						This reset link is invalid or has expired. Please request a new one.
					</AlertTitle>
				</Alert>
				<div className="text-center text-sm">
					<Link to="/password/forgot" className="underline underline-offset-4">
						Request a new reset link
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<FormComponent
				fields={fields}
				handleSubmit={(value: {
					newPassword: string;
					confirmPassword: string;
				}) => {
					if (value.newPassword !== value.confirmPassword) {
						throw new Error("Passwords do not match");
					}

					return resetPassword({ token, newPassword: value.newPassword });
				}}
				onSuccess={() => {
					navigate({ to: "/login", search: { reset: true } });
				}}
				options={{
					submitText: "Reset password",
					btnWidth: "w-full",
				}}
			/>
			<div className="text-center text-sm">
				<Link to="/login" className="underline-offset-4 hover:underline">
					Back to login
				</Link>
			</div>
		</div>
	);
}
