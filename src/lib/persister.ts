import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { del, get, set } from "idb-keyval";

export const indexedDBPersister = createAsyncStoragePersister({
	storage: {
		getItem: async (key) => await get(key),
		setItem: async (key, value) => await set(key, value),
		removeItem: async (key) => await del(key),
	},
});
