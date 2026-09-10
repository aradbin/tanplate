import { lazy, Suspense } from "react";
import type { FormFieldType } from "@/lib/types";
import ColorField from "./color-field";
import DateField from "./date-field";
import DateTimeField from "./datetime-field";
import FileField from "./file-field";
import InputField from "./input-field";
import MonthField from "./month-field";
import PhoneField from "./phone-field";
import SelectField from "./select-field";
import SwitchField from "./switch-field";
import TextareaField from "./textarea-field";

/**
 * Loaded on demand: the editor and its document model are by far the heaviest
 * thing any field pulls in, and most forms — login, a task's due date, a one-line
 * reason — have no rich text field at all. Importing it statically would put that
 * weight in the shared form chunk that every one of them loads.
 */
const RichTextField = lazy(() => import("./rich-text-field"));

/** Holds the editor's footprint while its chunk arrives, so nothing jumps. */
function RichTextFallback() {
	return <div className="min-h-30 w-full rounded-md border bg-transparent" />;
}

export default function RenderField({ field }: { field: FormFieldType }) {
	switch (field.type) {
		case "select":
		case "user":
			return <SelectField field={field} />;
		case "date":
			return <DateField field={field} />;
		case "datetime":
			return <DateTimeField field={field} />;
		case "switch":
			return <SwitchField field={field} />;
		case "month":
			return <MonthField field={field} />;
		case "textarea":
			return <TextareaField field={field} />;
		case "richtext":
			return (
				<Suspense fallback={<RichTextFallback />}>
					<RichTextField field={field} />
				</Suspense>
			);
		case "phone":
			return <PhoneField field={field} />;
		case "color":
			return <ColorField field={field} />;
		case "file":
			return <FileField field={field} />;

		default:
			return <InputField field={field} />;
	}
}
