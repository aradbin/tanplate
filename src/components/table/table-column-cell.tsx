import type { ReactNode } from "react";

export default function TableColumnCell({ children }: { children: ReactNode }) {
	return (
		<div className="flex justify-center items-center text-center">
			{children}
		</div>
	);
}
