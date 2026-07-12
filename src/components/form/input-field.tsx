import { Input } from "@/components/ui/input";
import type { FormFieldType } from "@/lib/types";

export default function InputField({ field }: { field: FormFieldType }) {
	return (
		<Input
			id={field?.name}
			name={field?.name}
			value={field?.value}
			onBlur={field?.handleBlur}
			onChange={(e) =>
				field?.handleChange(
					field?.type === "number" ? Number(e.target.value) : e.target.value,
				)
			}
			aria-invalid={!field?.isValid}
			aria-describedby={field?.ariaDescribedBy}
			type={field?.type || "text"}
			placeholder={field?.placeholder || ""}
			disabled={field?.disabled || false}
			readOnly={field?.readonly || false}
		/>
	);
}
