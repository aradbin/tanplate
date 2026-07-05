import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnyType } from "@/lib/types";

export default function TableReset({
	hasReset,
	preserve = [],
}: {
	hasReset?: boolean;
	preserve?: string[];
}) {
	const navigate: AnyType = useNavigate();

	if (hasReset) {
		return (
			<Button
				variant="outline"
				onClick={() => {
					navigate({
						search: (prev: AnyType) =>
							Object.fromEntries(
								preserve
									.map((key) => [key, prev?.[key]])
									.filter(([, value]) => value !== undefined),
							),
						replace: true,
					});
				}}
			>
				Reset
				<X />
			</Button>
		);
	}

	return null;
}
