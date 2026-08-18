import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Download,
	Eye,
	File as FileIcon,
	FileSpreadsheet,
	FileText,
	Image as ImageIcon,
	Plus,
	Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import { z } from "zod/v4";
import ModalComponent from "@/components/common/modal-component";
import FormComponent from "@/components/form/form-component";
import {
	Attachment,
	AttachmentActions,
	AttachmentContent,
	AttachmentDescription,
	AttachmentMedia,
	AttachmentTitle,
} from "@/components/ui/attachment";
import { Button, buttonVariants } from "@/components/ui/button";
import type { AnyType, FormFieldType, ModalStateType } from "@/lib/types";
import { cn, formatBytes } from "@/lib/utils";
import { useApp } from "@/providers/app-provider";
import {
	createAttachment,
	deleteAttachment,
	getAttachments,
} from "./-attachments";

function attachmentIcon(mime: string) {
	if (mime.startsWith("image/")) return <ImageIcon />;
	if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv"))
		return <FileSpreadsheet />;
	if (
		mime.includes("pdf") ||
		mime.includes("word") ||
		mime.includes("document") ||
		mime.startsWith("text/")
	)
		return <FileText />;
	return <FileIcon />;
}

const attachmentUrl = (id: string) => `/api/tasks/attachments/${id}`;

const queryKey = (taskId: string) => ["taskAttachments", taskId];

/**
 * Modal that manages a task's attachments (add + delete). Open it with
 * `openModal(TaskAttachmentsModal, { id: taskId })`.
 */
export default function TaskAttachmentsModal({
	modal,
	setModal,
}: {
	modal: ModalStateType;
	setModal: (state: ModalStateType) => void;
}) {
	const taskId = modal?.id ?? "";
	const { openModal, setDeleteModal } = useApp();
	const queryClient = useQueryClient();

	const { data: attachments } = useQuery({
		queryKey: queryKey(taskId),
		queryFn: () => getAttachments({ data: { where: { taskId } } }),
		enabled: !!taskId,
	});

	const refresh = () =>
		queryClient.invalidateQueries({ queryKey: queryKey(taskId) });

	return (
		<ModalComponent
			variant="sheet"
			options={{
				header: "Attachments",
				isOpen: modal?.isOpen,
				onClose: () => setModal(null),
			}}
		>
			{() => (
				<div className="flex flex-col gap-3">
					<Button
						variant="outline"
						size="sm"
						className="w-fit"
						onClick={() =>
							openModal(AttachmentUploadForm, {
								id: taskId,
								onSuccess: refresh,
							})
						}
					>
						<Plus />
						Add attachment
					</Button>

					{attachments?.length ? (
						<div className="flex flex-col gap-2">
							{attachments.map((attachment) => (
								<AttachmentRow
									key={attachment.id}
									url={attachmentUrl(attachment.id)}
									name={attachment.name}
									description={formatBytes(attachment.size)}
									icon={attachmentIcon(attachment.mimeType)}
									action={
										<Button
											type="button"
											variant="ghost"
											size="icon"
											aria-label="Delete attachment"
											className="text-destructive hover:text-destructive"
											onClick={() =>
												setDeleteModal({
													id: attachment.id,
													title: "Attachment",
													table: "taskAttachments",
													fn: deleteAttachment,
													onSuccess: refresh,
												})
											}
										>
											<Trash2 />
										</Button>
									}
								/>
							))}
						</div>
					) : (
						<span className="text-sm text-muted-foreground">
							No attachments yet.
						</span>
					)}
				</div>
			)}
		</ModalComponent>
	);
}

function AttachmentRow({
	url,
	name,
	description,
	icon,
	action,
}: {
	url: string;
	name: string;
	description: string;
	icon: ReactNode;
	action?: ReactNode;
}) {
	const linkClass = cn(buttonVariants({ variant: "ghost", size: "icon" }));

	return (
		<Attachment className="w-full">
			<div className="flex min-w-0 flex-1 items-center gap-2">
				<AttachmentMedia variant="icon">{icon}</AttachmentMedia>
				<AttachmentContent>
					<AttachmentTitle>{name}</AttachmentTitle>
					<AttachmentDescription>{description}</AttachmentDescription>
				</AttachmentContent>
			</div>
			<AttachmentActions>
				<a
					href={url}
					target="_blank"
					rel="noreferrer"
					aria-label="View"
					className={linkClass}
				>
					<Eye />
				</a>
				<a
					href={url}
					target="_blank"
					rel="noreferrer"
					download={name}
					aria-label="Download"
					className={linkClass}
				>
					<Download />
				</a>
				{action}
			</AttachmentActions>
		</Attachment>
	);
}

/**
 * Upload form. The `file` field makes `FormComponent` submit multipart
 * `FormData`, which `createAttachment`'s validator reads directly — so `taskId`
 * rides along as a hidden field rather than a separate argument.
 */
function AttachmentUploadForm({
	modal,
	setModal,
}: {
	modal: ModalStateType;
	setModal: (state: ModalStateType) => void;
}) {
	const taskId = modal?.id ?? "";

	const formFields: FormFieldType[][] = [
		[
			{
				name: "file",
				type: "file",
				label: "File",
				validationOnSubmit: z.instanceof(File, {
					error: "Please choose a file",
				}),
			},
		],
		[
			{
				name: "taskId",
				type: "hidden",
				defaultValue: taskId,
			},
		],
	];

	return (
		<ModalComponent
			variant="sheet"
			options={{
				header: "Add Attachment",
				isOpen: modal?.isOpen,
				onClose: () => setModal(null),
			}}
		>
			{(props) => (
				<FormComponent
					fields={formFields}
					handleSubmit={(formData: AnyType) =>
						createAttachment({ data: formData })
					}
					values={{ taskId }}
					onSuccess={(result: AnyType) => {
						props.close();
						modal?.onSuccess?.(result);
					}}
					onCancel={() => props.close()}
					options={{ submitText: "Upload" }}
				/>
			)}
		</ModalComponent>
	);
}
