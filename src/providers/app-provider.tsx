import { generateId } from "better-auth";
import {
	type ComponentType,
	createContext,
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useCallback,
	useContext,
	useState,
} from "react";
import type { AnyType, ModalStateType } from "@/lib/types";

type DeleteModalStateType = {
	id: string | null;
	title: string;
	table: AnyType;
	action?: string;
	submitVariant?: "default" | "destructive";
	fn: (args: { data: { id: string } }) => Promise<AnyType>;
	onSuccess?: () => void;
} | null;

type ModalStateProps = {
	modal: ModalStateType;
	setModal: (state: ModalStateType) => void;
};

type ModalStackEntry = {
	id: string;
	Component: ComponentType<ModalStateProps>;
	state: NonNullable<ModalStateType>;
};

type AppStateType = {
	deleteModal: DeleteModalStateType;
	setDeleteModal: Dispatch<SetStateAction<DeleteModalStateType>>;
	modalStack: ModalStackEntry[];
	openModal: (
		Component: ComponentType<ModalStateProps>,
		state?: Partial<Omit<NonNullable<ModalStateType>, "isOpen">>,
	) => void;
	closeModal: (entryId: string) => void;
};

const initialState: AppStateType = {
	deleteModal: null,
	setDeleteModal: () => {},
	modalStack: [],
	openModal: () => {},
	closeModal: () => {},
};

const AppContext = createContext<AppStateType>(initialState);

export function AppProvider({ children }: { children: ReactNode }) {
	const [deleteModal, setDeleteModal] = useState<DeleteModalStateType>(null);
	const [modalStack, setModalStack] = useState<ModalStackEntry[]>([]);

	const openModal = useCallback(
		(
			Component: ComponentType<ModalStateProps>,
			state?: Partial<Omit<NonNullable<ModalStateType>, "isOpen">>,
		) => {
			setModalStack((prev) => [
				...prev,
				{
					id: generateId(),
					Component,
					state: {
						id: state?.id ?? null,
						isOpen: true,
						item: state?.item,
						onSuccess: state?.onSuccess,
					},
				},
			]);
		},
		[],
	);

	const closeModal = useCallback((entryId: string) => {
		setModalStack((prev) => prev.filter((e) => e.id !== entryId));
	}, []);

	return (
		<AppContext.Provider
			value={{
				deleteModal,
				setDeleteModal,
				modalStack,
				openModal,
				closeModal,
			}}
		>
			{children}
		</AppContext.Provider>
	);
}

export const useApp = () => {
	const context = useContext(AppContext);

	if (context === undefined) {
		throw new Error("useApp must be used within a AppProvider");
	}

	return context;
};
