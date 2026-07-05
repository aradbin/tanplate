import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getAuthQueryOption } from "@/lib/auth/functions";
import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{
	queryClient: QueryClient;
}>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Tenplate | Tanstack Start Template",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	beforeLoad: async ({ context: { queryClient } }) => {
		const user = await queryClient.ensureQueryData(getAuthQueryOption);

		return { user };
	},
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className="dark" dir="ltr" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body className="bg-background text-foreground antialiased overscroll-none">
				<ThemeProvider defaultTheme="dark" storageKey="mode">
					<QueryProvider>
						<TooltipProvider>
							<AuthProvider>{children}</AuthProvider>
						</TooltipProvider>
					</QueryProvider>
					<Toaster richColors position="bottom-center" />
				</ThemeProvider>
				<Scripts />
			</body>
		</html>
	);
}
