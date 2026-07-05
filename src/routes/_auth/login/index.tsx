import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import FormComponent from "@/components/form/form-component";
import { signIn } from "@/lib/auth/functions";
import type { FormFieldType } from "@/lib/types";
import {
	emailRequiredValidation,
	passwordRequiredValidation,
	stringValidation,
	validate,
} from "@/lib/validations";
import { useAuth } from "@/providers/auth-provider";

export const Route = createFileRoute("/_auth/login/")({
	validateSearch: validate({
		redirect: stringValidation("Redirect", Infinity).catch(undefined),
	}),
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();
	const { refetch } = useAuth();
	const { redirect } = Route.useSearch();
	const emailRef = useRef<string>("");

	const fields: FormFieldType[][] = [
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
				handleSubmit={(value: { email: string; password: string }) => {
					emailRef.current = value.email;
					return signIn(value);
				}}
				onSuccess={async () => {
					await refetch();
					navigate({ to: redirect || "/" });
				}}
				onError={(error: Error) => {
					if (
						error instanceof Error &&
						error.message.toLowerCase().includes("email not verified")
					) {
						navigate({
							to: "/verify",
							search: {
								email: emailRef.current,
								redirect,
							},
						});
					}
				}}
				options={{
					submitText: "Login",
					btnWidth: "w-full",
				}}
			/>
			<div className="flex flex-col gap-2">
				<div className="text-center text-sm">
					<Link to="/" className="underline-offset-4 hover:underline">
						Forgot your password?
					</Link>
				</div>
				<div className="text-center text-sm">
					Don&apos;t have an account?{" "}
					<Link
						to="/register"
						search={{ redirect }}
						className="underline underline-offset-4"
					>
						Register
					</Link>
				</div>
			</div>
		</div>
	);
}
