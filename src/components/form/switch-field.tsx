import { Switch } from "@/components/ui/switch";
import type { FormFieldType } from "@/lib/types";

export default function SwitchField({ field }: { field: FormFieldType }) {
	return (
		<Switch
			id={field?.name}
			checked={!!field?.value}
			onCheckedChange={(checked) => field?.handleChange(checked)}
			onBlur={field?.handleBlur}
			disabled={field?.disabled || false}
			aria-invalid={!field?.isValid}
		/>
	);
}
