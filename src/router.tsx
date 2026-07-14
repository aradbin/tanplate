import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import ErrorComponent from "@/components/app/error-component";
import FullPageComponent from "@/components/app/full-page-component";
import LoadingComponent from "@/components/app/loading-component";
import NotFoundComponent from "@/components/app/not-found-component";
import UnauthorizedComponent from "@/components/app/unauthorized-component";
import { isPermissionDeniedError } from "@/lib/auth/permissions";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 1000 * 60 * 1, // 1 minutes
				gcTime: 1000 * 60 * 60 * 24, // 24h (must >= maxAge for persist)
				retry: 0,
			},
		},
	});

	const router = createRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		defaultNotFoundComponent: () => (
			<FullPageComponent>
				<NotFoundComponent />
			</FullPageComponent>
		),
		defaultErrorComponent: ({ error }) => (
			<FullPageComponent>
				{isPermissionDeniedError(error) ? (
					<UnauthorizedComponent />
				) : (
					<ErrorComponent />
				)}
			</FullPageComponent>
		),
		defaultPendingComponent: () => (
			<FullPageComponent>
				<LoadingComponent isLoading />
			</FullPageComponent>
		),
	});

	setupRouterSsrQueryIntegration({ router, queryClient });

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
