import { InputPhone } from "@/components/custom/input-phone";
import type { FormFieldType } from "@/lib/types";

export default function PhoneField({ field }: { field: FormFieldType }) {
	return (
		<InputPhone
			id={field?.name}
			name={field?.name}
			value={field?.value}
			onBlur={field?.handleBlur}
			onChange={(e) => field?.handleChange(e)}
			aria-invalid={field?.isInvalid}
			aria-describedby={field?.ariaDescribedBy}
			type={field?.type || "text"}
			placeholder={field?.placeholder || ""}
			disabled={field?.disabled || false}
			readOnly={field?.readonly || false}
			autoComplete="off"
			// defaultCountry="BD"
			international
		/>
	);
}
