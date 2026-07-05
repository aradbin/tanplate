import { Loader2 } from "lucide-react";

export default function LoadingComponent({
	isLoading,
	classNames,
}: {
	isLoading: boolean | null | undefined;
	classNames?: string;
}) {
	if (!isLoading) {
		return null;
	}

	return (
		<div
			className={`absolute top-0 left-0 right-0 bottom-0 z-50 flex gap-2 items-center justify-center rounded-xl bg-black/30 backdrop-blur-sm ${classNames}`}
		>
			<Loader2 className="animate-spin" />
		</div>
	);
}
