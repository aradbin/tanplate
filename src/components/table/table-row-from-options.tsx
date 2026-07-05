import type { AnyType, OptionType } from "@/lib/types";
import OptionComponent from "../common/option-component";

export default function TableRowFromOptions({
	value,
	options,
}: {
	value: AnyType;
	options: OptionType[];
}) {
	const matched = options.find((item) => item.id === value);

	if (!matched) {
		return null;
	}

	return <OptionComponent option={matched} />;
}
