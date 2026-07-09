import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef } from "react";
import FormComponent from "@/components/form/form-component";
import { signUp, verificationCallbackURL } from "@/lib/auth/functions";
import type { FormFieldType } from "@/lib/types";
import {
	emailRequiredValidation,
	passwordRequiredValidation,
	stringRequiredValidation,
	stringValidation,
	validate,
} from "@/lib/validations";

export const Route = createFileRoute("/_auth/register/")({
	validateSearch: validate({
		redirect: stringValidation("Redirect", Infinity).catch(undefined),
	}),
	component: RouteComponent,
});

function RouteComponent() {
	const { redirect } = Route.useSearch();
	const navigate = Route.useNavigate();
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
					email: string;
					password: string;
				}) => {
					emailRef.current = values.email;
					return signUp({
						...values,
						callbackURL: verificationCallbackURL(redirect),
					});
				}}
				onSuccess={() => {
					navigate({
						to: "/verify",
						search: {
							email: emailRef.current,
							redirect,
						},
					});
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
