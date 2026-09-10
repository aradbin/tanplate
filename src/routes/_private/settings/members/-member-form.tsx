import { useQuery } from "@tanstack/react-query";
import ModalComponent from "@/components/common/modal-component";
import FormComponent from "@/components/form/form-component";
import { assignableRoleOptions } from "@/lib/auth/permissions";
import { getMember, updateMember } from "@/lib/organization/functions";
import type { AnyType, FormFieldType, ModalStateType } from "@/lib/types";
import { stringRequiredValidation, stringValidation } from "@/lib/validations";

/** Change what a member may do inside this organization, and what they are called. */
export default function MemberForm({
	modal,
	setModal,
}: {
	modal: ModalStateType;
	setModal: (state: ModalStateType) => void;
}) {
	const { data, isLoading } = useQuery({
		queryKey: ["member", modal?.id],
		queryFn: () => getMember({ data: { where: { id: modal?.id } } }),
		enabled: !!modal?.id && modal?.isOpen,
	});

	const formFields: FormFieldType[][] = [
		[
			{
				name: "role",
				type: "select",
				options: assignableRoleOptions,
				validationOnSubmit: stringRequiredValidation("Role"),
				placeholder: "Select role",
			},
		],
		[
			{
				name: "designation",
				label: "Designation",
				validationOnSubmit: stringValidation("Designation", 200),
			},
		],
	];

	return (
		<ModalComponent
			variant="sheet"
			options={{
				header: data?.user?.name ? `Member — ${data.user.name}` : "Member",
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
						updateMember({ data: { ...values, id: modal?.id } })
					}
					values={
						modal?.isOpen && modal?.id && data
							? { role: data.role, designation: data.designation }
							: {}
					}
					onSuccess={() => {
						props.close();
					}}
					onCancel={() => {
						props.close();
					}}
					options={{
						isLoading,
						queryKey: "member",
					}}
				/>
			)}
		</ModalComponent>
	);
}
