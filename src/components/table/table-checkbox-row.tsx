import type { Row } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import type { AnyType } from "@/lib/types";

export default function TableCheckboxRow({ row }: { row: Row<AnyType> }) {
	return (
		<Checkbox
			checked={row.getIsSelected()}
			onCheckedChange={(value) => row.toggleSelected(!!value)}
			aria-label="Select row"
			className="translate-y-0.5"
		/>
	);
}
