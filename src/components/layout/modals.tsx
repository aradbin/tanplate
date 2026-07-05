import { useApp } from "@/providers/app-provider";
import DeleteComponent from "../common/delete-component";

export default function Modals() {
	const { modalStack, closeModal } = useApp();

	return (
		<div>
			<DeleteComponent />
			{modalStack.map((entry) => (
				<entry.Component
					key={entry.id}
					modal={entry.state}
					setModal={(state) => {
						if (!state || !state.isOpen) {
							closeModal(entry.id);
						}
					}}
				/>
			))}
		</div>
	);
}
