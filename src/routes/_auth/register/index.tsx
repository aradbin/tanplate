import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef } from "react";
import FormComponent from "@/components/form/form-component";
import { signUp } from "@/lib/auth/functions";
import type { FormFieldType } from "@/lib/types";
import {
	emailRequiredValidation,
	passwordRequiredValidation,
	stringRequiredValidation,
	stringValidation,
	validate,
} from "@/lib/validations";
import { useAuth } from "@/providers/auth-provider";

export const Route = createFileRoute("/_auth/register/")({
	validateSearch: validate({
		redirect: stringValidation("Redirect", Infinity).catch(undefined),
	}),
	component: RouteComponent,
});

function RouteComponent() {
	const { redirect } = Route.useSearch();
	const navigate = Route.useNavigate();
	const { refetch } = useAuth();
	const emailRef = useRef<string>("");

	const fields: FormFieldType[][] = [
		[
			{
				name: "name",
				validationOnSubmit: stringRequiredValidation("Name", 1000),
				placeholder: "Enter your name",
			},
		],
		[
			{
				name: "email",
				validationOnSubmit: emailRequiredValidation("Email"),
				placeholder: "example@email.com",
			},
		],
		[
			{
				name: "password",
				type: "password",
				validationOnSubmit: passwordRequiredValidation("Password"),
				placeholder: "••••••••",
			},
		],
	];

	return (
		<div className="space-y-4">
			<FormComponent
				fields={fields}
				handleSubmit={(values: {
					name: string;
					phone?: string;
					email: string;
					password: string;
				}) => {
					emailRef.current = values.email;
					return signUp({
						...values,
						callbackURL: redirect || "/organizations",
					});
				}}
				onSuccess={async () => {
					await refetch();
					navigate({
						to: "/verify",
						search: {
							email: emailRef.current,
							redirect,
						},
					});
				}}
				onError={(error: Error) => {
					if (
						error instanceof Error &&
						error.message.toLowerCase().includes("user already exists")
					) {
						navigate({
							to: "/verify",
							search: {
								email: emailRef.current,
								exists: true,
								redirect,
							},
						});
					}
				}}
				options={{
					submitText: "Register",
					btnWidth: "w-full",
				}}
			/>
			<div className="flex flex-col gap-2">
				<div className="text-center text-sm">
					Already have an account?{" "}
					<Link
						to="/login"
						search={{ redirect }}
						className="underline underline-offset-4"
					>
						Login
					</Link>
				</div>
			</div>
		</div>
	);
}
