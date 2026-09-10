import ModalComponent from "@/components/common/modal-component";
import FormComponent from "@/components/form/form-component";
import { assignableRoleOptions } from "@/lib/auth/permissions";
import { inviteMember } from "@/lib/organization/functions";
import type { AnyType, FormFieldType, ModalStateType } from "@/lib/types";
import {
	emailRequiredValidation,
	stringRequiredValidation,
} from "@/lib/validations";

/**
 * Invite someone by email address.
 *
 * There is no "create user" counterpart: an organization grants membership, and
 * the person owns their own account. An invitee without one registers first, and
 * the invitation is waiting when they do.
 */
export default function InviteMemberForm({
	modal,
	setModal,
}: {
	modal: ModalStateType;
	setModal: (state: ModalStateType) => void;
}) {
	const formFields: FormFieldType[][] = [
		[
			{
				name: "email",
				type: "email" as const,
				validationOnSubmit: emailRequiredValidation("Email"),
				placeholder: "Enter email address",
			},
		],
		[
			{
				name: "role",
				type: "select",
				options: assignableRoleOptions,
				validationOnSubmit: stringRequiredValidation("Role"),
				placeholder: "Select role",
				defaultValue: "member",
			},
		],
	];

	return (
		<ModalComponent
			variant="sheet"
			options={{
				header: "Invite Member",
				isOpen: modal?.isOpen,
				onClose: () => {
					setModal(null);
				},
			}}
		>
			{(props) => (
				<FormComponent
					fields={formFields}
					handleSubmit={(values: AnyType) => inviteMember({ data: values })}
					onSuccess={() => {
						props.close();
					}}
					onCancel={() => {
						props.close();
					}}
					options={{
						submitText: "Send Invitation",
						queryKey: "invitation",
					}}
				/>
			)}
		</ModalComponent>
	);
}
