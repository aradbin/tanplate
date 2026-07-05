import { useMemo } from "react";
import ModalComponent from "@/components/common/modal-component";
import FormComponent from "@/components/form/form-component";
import { changePassword } from "@/lib/auth/functions";
import type { FormFieldType, ModalStateType } from "@/lib/types";
import { passwordRequiredValidation } from "@/lib/validations";

export default function ChangePasswordForm({
	modal,
	setModal,
}: {
	modal: ModalStateType;
	setModal: (state: ModalStateType) => void;
}) {
	const fields: FormFieldType[][] = useMemo(
		() => [
			[
				{
					name: "currentPassword",
					label: "Current Password",
					type: "password",
					validationOnSubmit: passwordRequiredValidation("Current password"),
					placeholder: "Enter current password",
				},
			],
			[
				{
					name: "newPassword",
					label: "New Password",
					type: "password",
					validationOnSubmit: passwordRequiredValidation("New password"),
					placeholder: "Enter new password",
				},
			],
			[
				{
					name: "confirmPassword",
					label: "Confirm New Password",
					type: "password",
					validationOnSubmit: passwordRequiredValidation("Confirm password"),
					placeholder: "Confirm new password",
				},
			],
		],
		[],
	);

	return (
		<ModalComponent
			variant="sheet"
			options={{
				header: "Change Password",
				isOpen: modal?.isOpen,
				onClose: () => {
					setModal(null);
				},
			}}
		>
			{(props) => (
				<FormComponent
					fields={fields}
					handleSubmit={(values: {
						currentPassword: string;
						newPassword: string;
						confirmPassword: string;
					}) => {
						if (values.newPassword !== values.confirmPassword) {
							throw new Error("Passwords do not match");
						}

						return changePassword({
							data: {
								currentPassword: values.currentPassword,
								newPassword: values.newPassword,
							},
						});
					}}
					onSuccess={() => {
						props.close();
					}}
					onCancel={() => {
						props.close();
					}}
				/>
			)}
		</ModalComponent>
	);
}
