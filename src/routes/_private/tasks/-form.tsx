import { useQuery } from "@tanstack/react-query";
import ModalComponent from "@/components/common/modal-component";
import FormComponent from "@/components/form/form-component";
import type { FormFieldType, ModalStateType } from "@/lib/types";
import { stringRequiredValidation, stringValidation } from "@/lib/validations";
import { taskStatusOptions } from "@/lib/variables";
import { useAuth } from "@/providers/auth-provider";
import {
	createTask,
	type createTaskValidator,
	getTask,
	updateTask,
	type updateTaskValidator,
} from "./-functions";

export default function TaskForm({
	modal,
	setModal,
}: {
	modal: ModalStateType;
	setModal: (state: ModalStateType) => void;
}) {
	const { user } = useAuth();
	const { data, isLoading } = useQuery({
		queryKey: ["tasks", modal?.id],
		queryFn: () =>
			getTask({ data: { where: { id: modal?.id } } }),
		enabled: !!modal?.id && modal?.isOpen,
	});

	console.log("data", modal?.id, data);

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
				name: "status",
				type: "select",
				options: taskStatusOptions,
				validationOnSubmit: stringRequiredValidation("Status"),
				placeholder: "Enter task status",
				defaultValue: "todo",
			},
		],
		[
			{
				name: "dueDate",
				type: "date",
				validationOnSubmit: stringRequiredValidation("Due Date"),
				placeholder: "Enter due date",
			},
		],
		[
			{
				name: "description",
				type: "textarea",
				validationOnSubmit: stringValidation("Description", 1000),
				placeholder: "Enter task description",
			},
		],
		[
			{
				name: "userId",
				type: "hidden",
				validationOnSubmit: stringRequiredValidation("User", 1000),
				placeholder: "Enter user",
				defaultValue: user?.id,
			},
		],
	];

	return (
		<ModalComponent
			variant="sheet"
			options={{
				header: modal?.id ? "Edit Task" : "Create Task",
				isOpen: modal?.isOpen,
				onClose: () => {
					setModal(null);
				},
			}}
		>
			{(props) => (
				<FormComponent
					fields={formFields}
					handleSubmit={(
						values: typeof createTaskValidator | typeof updateTaskValidator,
					) =>
						modal?.id
							? updateTask({ data: { ...values, id: modal.id } })
							: createTask({ data: values })
					}
					values={
						modal?.isOpen && modal?.id && data
							? {
									...data,
									userId: user?.id,
								}
							: {
									userId: user?.id,
								}
					}
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
