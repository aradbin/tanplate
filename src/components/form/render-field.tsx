import type { FormFieldType } from "@/lib/types";
import ColorField from "./color-field";
import DateField from "./date-field";
import InputField from "./input-field";
import MonthField from "./month-field";
import PhoneField from "./phone-field";
import SelectField from "./select-field";
import SwitchField from "./switch-field";
import TextareaField from "./textarea-field";

export default function RenderField({ field }: { field: FormFieldType }) {
	switch (field.type) {
		case "select":
		case "user":
			return <SelectField field={field} />;
		case "date":
			return <DateField field={field} />;
		case "switch":
			return <SwitchField field={field} />;
		case "month":
			return <MonthField field={field} />;
		case "textarea":
			return <TextareaField field={field} />;
		case "phone":
			return <PhoneField field={field} />;
		case "color":
			return <ColorField field={field} />;

		default:
			return <InputField field={field} />;
	}
}
