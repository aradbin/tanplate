import { useQuery } from "@tanstack/react-query";
import ModalComponent from "@/components/common/modal-component";
import FormComponent from "@/components/form/form-component";
import type { AnyType, FormFieldType, ModalStateType } from "@/lib/types";
import { stringRequiredValidation } from "@/lib/validations";
import { getTasks } from "./-functions";

export default function TaskForm({
	modal,
	setModal,
}: {
	modal: ModalStateType;
	setModal: (state: ModalStateType) => void;
}) {
	const { data, isLoading } = useQuery({
		queryKey: ["tasks", modal?.id],
		queryFn: () =>
			getTasks({ data: { where: { id: modal?.id }, first: true } }),
		enabled: !!modal?.id && modal?.isOpen,
	});

	const formFields: FormFieldType[][] = [
		[
			{
				name: "title",
				validationOnSubmit: stringRequiredValidation("Title", 1000),
				placeholder: "Enter task title",
			},
		],
		[
			{
				name: "description",
				type: "textarea",
				validationOnSubmit: stringRequiredValidation("Description", 1000),
				placeholder: "Enter task description",
			},
		],
	];

	return (
		<ModalComponent
			variant="sheet"
			options={{
				header: modal?.id ? "Edit Department" : "Create Department",
				isOpen: modal?.isOpen,
				onClose: () => {
					setModal(null);
				},
			}}
		>
			{(props) => (
				<FormComponent
					fields={formFields}
					handleSubmit={(values: Record<string, AnyType>) => {
						console.log(values);
					}}
					values={modal?.isOpen && modal?.id && data ? data : {}}
					onSuccess={() => {
						props.close();
					}}
					onCancel={() => {
						props.close();
					}}
					options={{
						isLoading: isLoading,
						queryKey: "tasks",
					}}
				/>
			)}
		</ModalComponent>
	);
}
