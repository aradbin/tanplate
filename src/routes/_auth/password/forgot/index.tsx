import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Mail } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import FormComponent from "@/components/form/form-component";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { forgetPassword } from "@/lib/auth/functions";
import type { FormFieldType } from "@/lib/types";
import {
	emailRequiredValidation,
	stringValidation,
	validate,
} from "@/lib/validations";

export const Route = createFileRoute("/_auth/password/forgot/")({
	validateSearch: validate({
		redirect: stringValidation("Redirect", Infinity).catch(undefined),
	}),
	component: RouteComponent,
});

function RouteComponent() {
	const { redirect } = Route.useSearch();
	const emailRef = useRef<string>("");
	const [submitted, setSubmitted] = useState(false);
	const [isResending, setIsResending] = useState(false);
	const [cooldown, setCooldown] = useState(0);

	const fields: FormFieldType[][] = [
		[
			{
				name: "email",
				validationOnSubmit: emailRequiredValidation("Email"),
				placeholder: "example@email.com",
			},
		],
	];

	const handleResend = async () => {
		setIsResending(true);
		try {
			await forgetPassword({ email: emailRef.current });
			toast.success("Reset link sent. Please check your inbox.");
			setCooldown(60);
			const interval = setInterval(() => {
				setCooldown((prev) => {
					if (prev <= 1) {
						clearInterval(interval);
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: "Failed to send reset link. Please try again.",
			);
		} finally {
			setIsResending(false);
		}
	};

	if (submitted) {
		return (
			<Empty className="pt-2">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Mail />
					</EmptyMedia>
					<EmptyTitle>Check your email</EmptyTitle>
					<EmptyDescription>
						If an account exists, we sent a password reset link to{" "}
						<span className="font-medium text-foreground">
							{emailRef.current}
						</span>
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent className="justify-center gap-2">
					<div className="text-center text-sm">
						Remembered your password?{" "}
						<Link
							to="/login"
							search={{ redirect }}
							className="underline underline-offset-4"
						>
							Login
						</Link>
					</div>
				</EmptyContent>
				<Button
					variant="outline"
					className="w-30"
					onClick={handleResend}
					disabled={isResending || cooldown > 0}
				>
					{isResending ? (
						<>
							<Loader2 className="animate-spin" /> Please wait
						</>
					) : cooldown > 0 ? (
						`Resend in ${cooldown}s`
					) : (
						"Resend email"
					)}
				</Button>
			</Empty>
		);
	}

	return (
		<div className="space-y-4">
			<FormComponent
				fields={fields}
				handleSubmit={(value: { email: string }) => {
					emailRef.current = value.email;
					return forgetPassword(value);
				}}
				onSuccess={() => {
					setSubmitted(true);
				}}
				options={{
					submitText: "Send reset link",
					btnWidth: "w-full",
				}}
			/>
			<div className="text-center text-sm">
				<Link
					to="/login"
					search={{ redirect }}
					className="underline-offset-4 hover:underline"
				>
					Back to login
				</Link>
			</div>
		</div>
	);
}
