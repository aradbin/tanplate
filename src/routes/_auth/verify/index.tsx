import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { authClient } from "@/lib/auth/client";
import { verificationCallbackURL } from "@/lib/auth/functions";
import {
	emailRequiredValidation,
	stringValidation,
	validate,
} from "@/lib/validations";

export const Route = createFileRoute("/_auth/verify/")({
	validateSearch: validate({
		email: emailRequiredValidation("Email").catch(""),
		redirect: stringValidation("Redirect", Infinity).catch(undefined),
	}),
	beforeLoad: async ({ search }) => {
		if (!search?.email) {
			throw redirect({
				to: "/register",
			});
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { email, redirect: redirectTo } = Route.useSearch();
	const [isResending, setIsResending] = useState(false);
	const [cooldown, setCooldown] = useState(0);

	const handleResend = async () => {
		setIsResending(true);
		try {
			if (!email) {
				throw redirect({
					to: "/register",
				});
			}
			const { error } = await authClient.sendVerificationEmail({
				email,
				callbackURL: verificationCallbackURL(redirectTo),
			});
			if (error) {
				throw new Error(error.message);
			}
			toast.success("Verification email sent. Please check your inbox.");
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
					: "Failed to send verification email. Please try again.",
			);
		} finally {
			setIsResending(false);
		}
	};

	return (
		<Empty className="pt-2">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<Mail />
				</EmptyMedia>
				<EmptyTitle>Check your email</EmptyTitle>
				<EmptyDescription>
					We sent a verification link to{" "}
					<span className="font-medium text-foreground">{email}</span>
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent className="justify-center gap-2">
				<div className="text-center text-sm">
					Already verified?{" "}
					<Link
						to="/login"
						search={{ redirect: redirectTo }}
						className="underline underline-offset-4"
					>
						Login
					</Link>
				</div>
				<div className="text-center text-sm">
					Register with different email?{" "}
					<Link
						to="/register"
						search={{ redirect: redirectTo }}
						className="underline underline-offset-4"
					>
						Register
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
