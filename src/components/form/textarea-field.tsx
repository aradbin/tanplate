import type { FormFieldType } from "@/lib/types";
import { Textarea } from "../ui/textarea";

export default function TextareaField({ field }: { field: FormFieldType }) {
	return (
		<Textarea
			id={field?.name}
			name={field?.name}
			value={field?.value}
			onBlur={field?.handleBlur}
			onChange={(e) => field?.handleChange(e.target.value)}
			aria-invalid={!field?.isValid}
			placeholder={field?.placeholder || ""}
			disabled={field?.disabled || false}
			readOnly={field?.readonly || false}
			className="min-h-30"
		/>
	);
}
