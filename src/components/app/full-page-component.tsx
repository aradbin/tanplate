import type { ReactNode } from "react";

export default function FullPageComponent({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<div className="flex h-svh w-full max-w-xl mx-auto items-center justify-center p-6 md:p-10">
			{children}
		</div>
	);
}
