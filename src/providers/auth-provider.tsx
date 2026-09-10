import { useRouteContext, useRouter } from "@tanstack/react-router";
import { createContext, type ReactNode, useCallback, useContext } from "react";
import {
	type AuthType,
	getAuthQueryOption,
	refreshAuth,
} from "@/lib/auth/functions";

type AuthStateType = {
	user: AuthType;
	refetch: () => Promise<void>;
};

const initialState: AuthStateType = {
	user: null,
	refetch: async () => {},
};

const AuthContext = createContext<AuthStateType>(initialState);

export function AuthProvider({ children }: { children: ReactNode }) {
	const { user, queryClient } = useRouteContext({ from: "__root__" });

	const router = useRouter();

	/**
	 * Re-resolve who the user is and which organization they are in.
	 *
	 * Reads through `refreshAuth` rather than the ordinary query because the
	 * moments that call this — signing in, creating or joining an organization,
	 * switching — are exactly the ones the session cookie cache is stale for.
	 * The result is seeded directly, and the `auth` query is deliberately left out
	 * of the invalidation sweep so nothing can immediately re-fetch it through the
	 * cache we just went around.
	 */
	const refetch = useCallback(async () => {
		const user = await refreshAuth();
		queryClient.setQueryData(getAuthQueryOption.queryKey, user);
		await queryClient.invalidateQueries({
			predicate: (query) => query.queryKey[0] !== "auth",
		});
		await router.invalidate();
	}, [queryClient, router]);

	return (
		<AuthContext.Provider
			value={{
				user,
				refetch,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export const useAuth = () => {
	const context = useContext(AuthContext);

	if (context === undefined) {
		throw new Error("useAuth must be used within a AuthProvider");
	}

	return context;
};
