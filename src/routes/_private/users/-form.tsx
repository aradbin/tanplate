import { useQuery } from "@tanstack/react-query";
import ModalComponent from "@/components/common/modal-component";
import FormComponent from "@/components/form/form-component";
import type { AnyType, FormFieldType, ModalStateType } from "@/lib/types";
import {
	emailRequiredValidation,
	passwordRequiredValidation,
	stringRequiredValidation,
} from "@/lib/validations";
import { roleOptions } from "@/lib/variables";
import { createUser, getUser, updateUser } from "./-functions";

export default function UserForm({
	modal,
	setModal,
}: {
	modal: ModalStateType;
	setModal: (state: ModalStateType) => void;
}) {
	const { data, isLoading } = useQuery({
		queryKey: ["user", modal?.id],
		queryFn: () =>
			getUser({ data: { where: { id: modal?.id } } }),
		enabled: !!modal?.id && modal?.isOpen,
	});

	const formFields: FormFieldType[][] = [
		[
			{
				name: "name",
				validationOnSubmit: stringRequiredValidation("Name"),
				placeholder: "Enter name",
			},
		],
		[
			{
				name: "email",
				type: "email" as const,
				validationOnSubmit: emailRequiredValidation("Email"),
				placeholder: "Enter email",
				readonly: !!modal?.id,
			},
		],
		...(modal?.id
			? []
			: [
					[
						{
							name: "password",
							type: "password" as const,
							validationOnSubmit: passwordRequiredValidation("Password"),
							placeholder: "Enter password",
						},
					],
				]),
		[
			{
				name: "role",
				type: "select",
				options: roleOptions,
				validationOnSubmit: stringRequiredValidation("Role"),
				placeholder: "Select role",
				defaultValue: "user",
			},
		],
	];

	return (
		<ModalComponent
			variant="sheet"
			options={{
				header: modal?.id ? "Edit User" : "Create User",
				isOpen: modal?.isOpen,
				onClose: () => {
					setModal(null);
				},
			}}
		>
			{(props) => (
				<FormComponent
					fields={formFields}
					handleSubmit={(values: AnyType) =>
						modal?.id
							? updateUser({ data: { ...values, id: modal.id } })
							: createUser({ data: values })
					}
					values={modal?.isOpen && modal?.id && data ? data : {}}
					onSuccess={() => {
						props.close();
					}}
					onCancel={() => {
						props.close();
					}}
					options={{
						isLoading: isLoading,
						queryKey: "user",
					}}
				/>
			)}
		</ModalComponent>
	);
}
