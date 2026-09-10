import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import LoadingComponent from "@/components/app/loading-component";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authClient } from "@/lib/auth/client";
import { signOut } from "@/lib/auth/functions";
import { useAuth } from "@/providers/auth-provider";

/**
 * Accept an organization invitation.
 *
 * Deliberately outside both route groups. `_auth` would bounce an invitee who is
 * already signed in, and `_private` would bounce one who is not — and then, once
 * they signed in, bounce them again to `/settings/organization/create`, because accepting their
 * first invitation is precisely the state that guard treats as "no organization
 * yet". This page is the one place both halves of that have to coexist.
 *
 * The invitation itself can only be read by its recipient: better-auth's
 * `get-invitation` is 401 without a session and 403 for anyone else's
 * invitation. So the page asks who is here *first* and only fetches when there
 * is someone to fetch as — otherwise a signed-out visitor holding a perfectly
 * good link would be told their invitation is invalid.
 *
 * The invitation id survives registration and email verification as the
 * `redirect` param that `verificationCallbackURL` already threads — no second
 * mechanism.
 */
export const Route = createFileRoute("/invitations/$id/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { user, refetch } = useAuth();
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	// The client returns `{ data, error }` rather than throwing, which is what
	// lets the page tell "not yours" apart from "gone".
	const { data: result, isLoading } = useQuery({
		queryKey: ["invitation", id],
		queryFn: () => authClient.organization.getInvitation({ query: { id } }),
		enabled: !!user,
		retry: false,
	});

	const invitation = result?.data ?? null;
	const failure = result?.error ?? null;
	const redirect = `/invitations/${id}`;

	if (isLoading) return <LoadingComponent isLoading />;

	/**
	 * Accepting points the session at the new organization, but only in the
	 * session row — the cookie cache still holds the copy that has no
	 * organization at all, and `_private` would read that and send them straight
	 * back to onboarding. `refetch` is what reads past it.
	 */
	const accept = async () => {
		setBusy(true);
		setError(null);
		const { error: failed } = await authClient.organization.acceptInvitation({
			invitationId: id,
		});
		setBusy(false);
		if (failed) {
			setError(failed.message ?? "This invitation could not be accepted.");
			return;
		}
		queryClient.clear();
		await refetch();
		navigate({ to: "/" });
	};

	const leave = async () => {
		const response = await signOut();
		if (response?.success) {
			queryClient.clear();
			await refetch();
			navigate({ to: "/login", search: { redirect } });
		}
	};

	return (
		<div className="flex min-h-svh items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardContent className="flex flex-col gap-4">
					{!user ? (
						<>
							<div>
								<h1 className="font-semibold text-lg">You have been invited</h1>
								<p className="text-muted-foreground text-sm">
									Sign in with the address the invitation was sent to, or create
									an account with it. You will come back here afterwards.
								</p>
							</div>
							<div className="flex flex-col gap-2">
								<Button
									onClick={() =>
										navigate({ to: "/login", search: { redirect } })
									}
								>
									Sign in
								</Button>
								<Button
									variant="outline"
									onClick={() =>
										navigate({ to: "/register", search: { redirect } })
									}
								>
									Create an account
								</Button>
							</div>
						</>
					) : invitation ? (
						<>
							<div>
								<h1 className="font-semibold text-lg">
									Join {invitation.organizationName ?? "the organization"}
								</h1>
								<p className="text-muted-foreground text-sm">
									This invitation was sent to {invitation.email}.
								</p>
							</div>
							{error && <p className="text-destructive text-sm">{error}</p>}
							<Button disabled={busy} onClick={accept}>
								Accept invitation
							</Button>
						</>
					) : failure?.status === 403 ? (
						<>
							<div>
								<h1 className="font-semibold text-lg">Wrong account</h1>
								<p className="text-muted-foreground text-sm">
									This invitation was sent to a different email address. You are
									signed in as {user.email}.
								</p>
							</div>
							<Button variant="outline" onClick={leave}>
								Sign out
							</Button>
						</>
					) : (
						<div>
							<h1 className="font-semibold text-lg">Invitation unavailable</h1>
							<p className="text-muted-foreground text-sm">
								It may have expired, been cancelled, or already been used.
							</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
