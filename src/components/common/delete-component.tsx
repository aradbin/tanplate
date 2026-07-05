import { useApp } from "@/providers/app-provider";
import FormComponent from "../form/form-component";
import ModalComponent from "./modal-component";

export default function DeleteComponent() {
	const { deleteModal, setDeleteModal } = useApp();

	return (
		<ModalComponent
			options={{
				header: `Delete${deleteModal ? ` ${deleteModal?.title}` : ""}`,
				description: `Are you sure you want to delete this${deleteModal ? ` ${deleteModal?.title?.toLowerCase()}` : ""}?`,
				isOpen: !!deleteModal,
				onClose: () => {
					setDeleteModal(null);
				},
			}}
		>
			{(props) => (
				<FormComponent
					fields={[]}
					handleSubmit={() => (deleteModal ? () => {} : {})}
					onSuccess={() => {
						props.close();
						deleteModal?.onSuccess?.();
					}}
					onCancel={() => {
						props.close();
					}}
					options={{
						queryKey: deleteModal?.table,
						submitText: "Delete",
						submitVariant: "destructive",
					}}
				/>
			)}
		</ModalComponent>
	);
}
