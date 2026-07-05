import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useRouteContext } from "@tanstack/react-router";
import { indexedDBPersister } from "@/lib/persister";
import type { AnyType } from "@/lib/types";

export function QueryProvider({ children }: { children: React.ReactNode }) {
	const { queryClient } = useRouteContext({ from: "__root__" });

	return (
		<PersistQueryClientProvider
			client={queryClient}
			persistOptions={{
				persister: indexedDBPersister,
				maxAge: 1000 * 60 * 60 * 24, // 24h
				buster: "buster-v1",
				dehydrateOptions: {
					shouldDehydrateQuery: (query: AnyType) => {
						const key = query.queryKey[0];
						const blacklist = ["auth"];
						return !blacklist.includes(key as string);
					},
				},
			}}
		>
			{children}
		</PersistQueryClientProvider>
	);
}
