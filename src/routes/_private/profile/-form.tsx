import { useQuery } from "@tanstack/react-query";
import ModalComponent from "@/components/common/modal-component";
import FormComponent from "@/components/form/form-component";
import type { AnyType, FormFieldType, ModalStateType } from "@/lib/types";
import { stringRequiredValidation } from "@/lib/validations";
import { useAuth } from "@/providers/auth-provider";
import { getProfile, updateProfile } from "./-functions";

/** The caller's own name and avatar. Everything else on `/profile` is read-only. */
export default function ProfileForm({
	modal,
	setModal,
}: {
	modal: ModalStateType;
	setModal: (state: ModalStateType) => void;
}) {
	const { user, refetch } = useAuth();

	const { data, isLoading } = useQuery({
		// The same key the page reads under, so the sheet shows what the card shows
		// instead of fetching the row a second time.
		queryKey: ["user", user?.id],
		queryFn: () => getProfile(),
		enabled: modal?.isOpen,
	});

	const formFields: FormFieldType[][] = [
		[
			{
				name: "name",
				validationOnSubmit: stringRequiredValidation("Name"),
				placeholder: "Enter your name",
			},
		],
		[
			{
				name: "image",
				type: "file",
				label: "Avatar",
				accept: "image/*",
				description: "PNG, JPEG, WebP or GIF, up to 2MB.",
				// Deliberately unvalidated: an empty field means "keep the current
				// avatar", and the type and size are checked server-side, where the
				// `accept` hint cannot be bypassed.
			},
		],
	];

	return (
		<ModalComponent
			variant="sheet"
			options={{
				header: "Edit Profile",
				isOpen: modal?.isOpen,
				onClose: () => {
					setModal(null);
				},
			}}
		>
			{(props) => (
				<FormComponent
					fields={formFields}
					handleSubmit={(formData: AnyType) =>
						updateProfile({ data: formData })
					}
					values={modal?.isOpen && data ? { name: data.name } : {}}
					onSuccess={async () => {
						// The sidebar avatar and every `context.user` read come from the
						// `["auth"]` query, which `getSession` serves from a five-minute
						// cookie cache — only `refetch` reads past it, so without this the
						// new name and image would appear on this page alone.
						await refetch();
						props.close();
					}}
					onCancel={() => {
						props.close();
					}}
					options={{
						isLoading,
						queryKey: "user",
					}}
				/>
			)}
		</ModalComponent>
	);
}
