import { useRouteContext, useRouter } from "@tanstack/react-router";
import { createContext, type ReactNode, useCallback, useContext } from "react";
import { type AuthType, getAuthQueryOption } from "@/lib/auth/functions";

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

	const refetch = useCallback(async () => {
		queryClient.removeQueries({ queryKey: ["auth"] });
		await queryClient.fetchQuery(getAuthQueryOption);
		await queryClient.invalidateQueries();
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
