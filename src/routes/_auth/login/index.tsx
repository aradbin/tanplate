import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useRef } from "react";
import FormComponent from "@/components/form/form-component";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { signIn } from "@/lib/auth/functions";
import type { FormFieldType } from "@/lib/types";
import {
	booleanValidation,
	emailRequiredValidation,
	passwordRequiredValidation,
	stringValidation,
	validate,
} from "@/lib/validations";
import { useAuth } from "@/providers/auth-provider";

export const Route = createFileRoute("/_auth/login/")({
	validateSearch: validate({
		redirect: stringValidation("Redirect", Infinity).catch(undefined),
		verified: booleanValidation("Verified").catch(undefined),
		reset: booleanValidation("Reset").catch(undefined),
		error: stringValidation("Error", Infinity).catch(undefined),
	}),
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();
	const { refetch } = useAuth();
	const { redirect, verified, reset, error } = Route.useSearch();
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
			{error ? (
				<Alert variant="destructive" className="border-destructive">
					<AlertCircle className="size-4" />
					<AlertTitle>
						This verification link is invalid or has expired. Please resend it.
					</AlertTitle>
				</Alert>
			) : verified ? (
				<Alert className="border-green-500 text-green-500 dark:text-green-500">
					<CheckCircle2 className="size-4" />
					<AlertTitle>Email verified! You can now log in.</AlertTitle>
				</Alert>
			) : reset ? (
				<Alert className="border-green-500 text-green-500 dark:text-green-500">
					<CheckCircle2 className="size-4" />
					<AlertTitle>Password reset successfully!</AlertTitle>
				</Alert>
			) : null}
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
					// better-auth returns 403 when sign-in is blocked on an
					// unverified email; fall back to the message for safety.
					const status = (error as { status?: number })?.status;
					if (
						status === 403 ||
						(error instanceof Error &&
							error.message.toLowerCase().includes("email not verified"))
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
					<Link
						to="/password/forgot"
						search={{ redirect }}
						className="underline-offset-4 hover:underline"
					>
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
