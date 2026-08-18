import { Input } from "@/components/ui/input";
import type { AnyType, FormFieldType } from "@/lib/types";

export default function FileField({ field }: { field: FormFieldType }) {
	return (
		<Input
			id={field?.name}
			name={field?.name}
			onBlur={field?.handleBlur}
			onChange={(e: AnyType) =>
				field?.handleChange(e.target.files?.[0] ?? undefined)
			}
			aria-invalid={!field?.isValid}
			aria-describedby={field?.ariaDescribedBy}
			type="file"
			accept={field?.accept}
			disabled={field?.disabled || false}
		/>
	);
}
