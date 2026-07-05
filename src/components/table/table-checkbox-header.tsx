import type { Table } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import type { AnyType } from "@/lib/types";

export default function TableCheckboxHeader({
	table,
}: {
	table: Table<AnyType>;
}) {
	return (
		<Checkbox
			checked={table.getIsAllPageRowsSelected()}
			onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
			aria-label="Select all"
			className="translate-y-0.5"
		/>
	);
}
