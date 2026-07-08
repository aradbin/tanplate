import { useApp } from "@/providers/app-provider";
import FormComponent from "../form/form-component";
import ModalComponent from "./modal-component";

export default function DeleteComponent() {
	const { deleteModal, setDeleteModal } = useApp();

	const action = deleteModal?.action ?? "Delete";

	return (
		<ModalComponent
			options={{
				header: `${action}${deleteModal ? ` ${deleteModal?.title}` : ""}`,
				description: `Are you sure you want to ${action.toLowerCase()} this${deleteModal ? ` ${deleteModal?.title?.toLowerCase()}` : ""}?`,
				isOpen: !!deleteModal,
				onClose: () => {
					setDeleteModal(null);
				},
			}}
		>
			{(props) => (
				<FormComponent
					fields={[]}
					handleSubmit={() =>
						deleteModal?.id
							? deleteModal.fn({ data: { id: deleteModal.id } })
							: undefined
					}
					onSuccess={() => {
						props.close();
						deleteModal?.onSuccess?.();
					}}
					onCancel={() => {
						props.close();
					}}
					options={{
						queryKey: deleteModal?.table,
						submitText: action,
						submitVariant: deleteModal?.submitVariant ?? "destructive",
					}}
				/>
			)}
		</ModalComponent>
	);
}
