import { useForm } from "@tanstack/react-form";
import { useRouteContext } from "@tanstack/react-router";
import { AlertCircle, Loader2 } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import LoadingComponent from "@/components/app/loading-component";
import RenderField from "@/components/form/render-field";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import type { AnyType, FormFieldType } from "@/lib/types";
import { capitalize, cn } from "@/lib/utils";
import { validate } from "@/lib/validations";

const colsClass: Record<number, string> = {
	1: "lg:grid-cols-1",
	2: "lg:grid-cols-2",
	3: "lg:grid-cols-3",
	4: "lg:grid-cols-4",
	5: "lg:grid-cols-5",
	6: "lg:grid-cols-6",
};

export default function FormComponent({
	fields,
	handleSubmit,
	children,
	values = {},
	onSuccess,
	onError,
	onCancel,
	options,
}: {
	fields: FormFieldType[][];
	handleSubmit: AnyType;
	children?: ReactNode;
	values?: Record<string, AnyType>;
	onSuccess?: AnyType;
	onError?: AnyType;
	onCancel?: AnyType;
	options?: {
		isLoading?: boolean;
		queryKey?: string | string[] | string[][];
		submitText?: string;
		cancelText?: string;
		loadingText?: string;
		btnWidth?: string;
		submitVariant?: "default" | "destructive";
		formClassNames?: string;
	};
}) {
	const { queryClient } = useRouteContext({ from: "__root__" });
	const [messageError, setMessageError] = useState<string | null | undefined>(
		null,
	);
	const flatFields = fields.flat();

	const defaultValues = flatFields.reduce(
		(flatDefaultValues, field) => {
			flatDefaultValues[field.name] = field.defaultValue ?? "";
			return flatDefaultValues;
		},
		{} as Record<string, AnyType>,
	);

	const schemaOnBlur = flatFields.reduce(
		(shape, field) => {
			if (field.validationOnBlur) {
				shape[field.name] = field.validationOnBlur;
			}
			return shape;
		},
		{} as Record<string, AnyType>,
	);

	const schemaOnChange = flatFields.reduce(
		(shape, field) => {
			if (field.validationOnChange) {
				shape[field.name] = field.validationOnChange;
			}
			return shape;
		},
		{} as Record<string, AnyType>,
	);

	const schemaOnSubmit = flatFields.reduce(
		(shape, field) => {
			if (field.validationOnSubmit) {
				shape[field.name] = field.validationOnSubmit;
			}
			return shape;
		},
		{} as Record<string, AnyType>,
	);

	const form = useForm({
		defaultValues: defaultValues,
		validators: {
			...(Object.keys(schemaOnSubmit)?.length
				? {
						onSubmit: validate(schemaOnSubmit),
					}
				: {}),
			...(Object.keys(schemaOnBlur)?.length
				? {
						onBlur: validate(schemaOnBlur),
					}
				: {}),
			...(Object.keys(schemaOnChange)?.length
				? {
						onChange: validate(schemaOnChange),
					}
				: {}),
		},
		onSubmit: async ({ value }) => {
			setMessageError(null);
			try {
				const response = await handleSubmit(value);
				console.log("form response", response);
				if (options?.queryKey) {
					const key = options.queryKey;

					if (
						typeof key === "string" ||
						(Array.isArray(key) && typeof key[0] === "string")
					) {
						queryClient.invalidateQueries({
							queryKey: typeof key === "string" ? [key] : key,
						});
					} else if (Array.isArray(key) && Array.isArray(key[0])) {
						(key as string[][]).forEach((k) => {
							queryClient.invalidateQueries({ queryKey: k });
						});
					}
				}
				if (response?.message) {
					options?.submitVariant === "destructive"
						? toast.error(response?.message)
						: toast.success(response?.message);
				}
				if (onSuccess) {
					await onSuccess(response);
				}
				form.reset();
			} catch (error) {
				if (onError) {
					onError(error);
				}
				setMessageError(
					error instanceof Error
						? error.message
						: "Something went wrong. Please try again.",
				);
			}
		},
	});

	useEffect(() => {
		if (Object.keys(values)?.length) {
			Object.keys(values)?.forEach((item) => {
				const field = flatFields.find((field) => field.name === item);
				if (field && values[item] !== null) {
					form.setFieldValue(item, values[item]);
				}
			});
		}
	}, [values, flatFields.find, form.setFieldValue]);

	return (
		<form
			className={cn("grid gap-4", options?.formClassNames)}
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
		>
			{fields?.map((fieldGroup, groupIndex) => (
				<FieldGroup
					className={`grid grid-cols-1 ${colsClass[fieldGroup?.length]} gap-2 items-baseline`}
					key={`${fieldGroup.length} ${groupIndex}`}
				>
					{fieldGroup?.map((field: FormFieldType) => (
						<form.Field key={field.name} name={field.name}>
							{(fieldProps) => {
								const isValid = fieldProps?.state?.meta?.isTouched
									? fieldProps?.state?.meta?.isValid
									: true;
								const isInvalid =
									fieldProps?.state?.meta?.isTouched &&
									!fieldProps?.state?.meta?.isValid;

								if (field.type === "hidden") {
									return null;
								}

								return (
									<Field data-invalid={isInvalid}>
										{field?.hideLabel ? (
											<span className="sr-only">
												{field?.label || capitalize(field?.name)}
											</span>
										) : (
											<FieldLabel htmlFor={field?.name}>
												{field?.label || capitalize(field?.name)}
											</FieldLabel>
										)}
										<RenderField
											field={{
												...field,
												isValid,
												value: fieldProps?.state?.value,
												handleBlur: fieldProps?.handleBlur,
												handleChange: (value: AnyType) => {
													fieldProps?.handleChange(value);
													field?.handleChange?.(value);
												},
											}}
										/>
										{field?.description && (
											<FieldDescription>{field?.description}</FieldDescription>
										)}
										{isInvalid && (
											<FieldError errors={fieldProps?.state?.meta?.errors} />
										)}
									</Field>
								);
							}}
						</form.Field>
					))}
				</FieldGroup>
			))}
			{children}
			{messageError && (
				<Alert variant="destructive" className="border-destructive">
					<AlertCircle className="size-4" />
					<AlertTitle>{messageError}</AlertTitle>
				</Alert>
			)}
			<div className="flex flex-row-reverse flex-wrap gap-2">
				<form.Subscribe selector={(state) => [state.isSubmitting]}>
					{([isSubmitting]) => (
						<Button
							variant={options?.submitVariant || "default"}
							type="submit"
							className={`${options?.btnWidth || "w-30"}`}
							disabled={isSubmitting || options?.isLoading}
							aria-busy={isSubmitting || options?.isLoading}
							aria-disabled={isSubmitting || options?.isLoading}
						>
							{isSubmitting || options?.isLoading ? (
								<>
									<Loader2 className="animate-spin" /> Please wait
								</>
							) : (
								options?.submitText || "Submit"
							)}
						</Button>
					)}
				</form.Subscribe>
				{onCancel && (
					<Button
						type="button"
						variant="outline"
						className={`${options?.btnWidth || "w-30"}`}
						onClick={() => {
							form.reset();
							onCancel();
						}}
					>
						{options?.cancelText || "Cancel"}
					</Button>
				)}
			</div>
			<LoadingComponent isLoading={options?.isLoading} />
		</form>
	);
}
