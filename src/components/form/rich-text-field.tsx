import { TableKit } from "@tiptap/extension-table";
import { TextAlign } from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extensions";
import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
	AlignCenter,
	AlignJustify,
	AlignLeft,
	AlignRight,
	Bold,
	ChevronDown,
	Code,
	Columns3,
	Ellipsis,
	Heading1,
	Heading2,
	Heading3,
	Heading4,
	Italic,
	Link2,
	Link2Off,
	List,
	ListOrdered,
	Minus,
	Pilcrow,
	Quote,
	Redo2,
	Rows3,
	SquareCode,
	Strikethrough,
	Table as TableIcon,
	Trash2,
	Underline,
	Undo2,
} from "lucide-react";
import { type ComponentType, type ReactNode, useEffect } from "react";
import { richTextProseClass } from "@/components/common/rich-text";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Toggle, toggleVariants } from "@/components/ui/toggle";
import { normalizeRichText } from "@/lib/rich-text";
import type { FormFieldType } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The `richtext` counterpart of [textarea-field.tsx](./textarea-field.tsx).
 *
 * This is the only file that imports the editor library, and the toolbar below is
 * built from this app's own primitives rather than from an editor UI package. The
 * value the field reports is **HTML**, not an editor-specific document format, so
 * the stored data outlives the library: swapping editors means rewriting this one
 * file behind an unchanged `FormFieldType` contract.
 *
 * `render-field.tsx` loads it lazily — the document model is by far the heaviest
 * thing any field pulls in, and most forms have no rich text field at all.
 *
 * Toolbar layout, left to right: history, then the three block controls that each
 * collapse a family of choices into one dropdown (heading / list / align), then
 * the inline marks a writer reaches for without looking, then an overflow menu
 * for everything used rarely enough that a permanent button costs more than it
 * saves. Anything added here has to be added to the sanitizer's allowlist in
 * [rich-text.ts](../../lib/rich-text.ts) too, or it will be stripped on save.
 */

type Level = 1 | 2 | 3 | 4;

const HEADINGS: {
	level: Level;
	label: string;
	icon: ComponentType<{ className?: string }>;
}[] = [
	{ level: 1, label: "Heading 1", icon: Heading1 },
	{ level: 2, label: "Heading 2", icon: Heading2 },
	{ level: 3, label: "Heading 3", icon: Heading3 },
	{ level: 4, label: "Heading 4", icon: Heading4 },
];

const ALIGNMENTS: {
	value: string;
	label: string;
	icon: ComponentType<{ className?: string }>;
}[] = [
	{ value: "left", label: "Left", icon: AlignLeft },
	{ value: "center", label: "Center", icon: AlignCenter },
	{ value: "right", label: "Right", icon: AlignRight },
	{ value: "justify", label: "Justify", icon: AlignJustify },
];

function ToolbarButton({
	label,
	icon: Icon,
	pressed = false,
	disabled = false,
	onClick,
}: {
	label: string;
	icon: ComponentType<{ className?: string }>;
	pressed?: boolean;
	disabled?: boolean;
	onClick: () => void;
}) {
	return (
		<Toggle
			size="sm"
			aria-label={label}
			title={label}
			pressed={pressed}
			disabled={disabled}
			// Without this the button takes focus on press and the editor loses its
			// selection, so the command would apply to nothing.
			onMouseDown={(event) => event.preventDefault()}
			onPressedChange={onClick}
		>
			<Icon className="size-3.5" />
		</Toggle>
	);
}

/**
 * A toolbar control that opens a menu instead of toggling.
 *
 * The trigger wears `toggleVariants` so it sits flush with the plain buttons, and
 * shows the icon of whatever is currently active — an H2 paragraph shows the H2
 * icon — so the current state is readable without opening anything.
 *
 * Unlike `ToolbarButton` this must not swallow mousedown: that is the event the
 * menu opens on. The selection survives anyway because every command below runs
 * through `.chain().focus()`, which puts the caret back before applying.
 */
function ToolbarMenu({
	label,
	icon: Icon,
	active = false,
	children,
}: {
	label: string;
	icon: ComponentType<{ className?: string }>;
	active?: boolean;
	children: ReactNode;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<button
						type="button"
						aria-label={label}
						title={label}
						className={cn(
							toggleVariants({ size: "sm" }),
							"gap-0.5 px-1.5",
							active && "bg-muted",
						)}
					/>
				}
			>
				<Icon className="size-3.5" />
				<ChevronDown className="size-3 opacity-60" />
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-auto min-w-44">
				{children}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function MenuItem({
	label,
	icon: Icon,
	active = false,
	disabled = false,
	onClick,
}: {
	label: string;
	icon: ComponentType<{ className?: string }>;
	active?: boolean;
	disabled?: boolean;
	onClick: () => void;
}) {
	return (
		<DropdownMenuItem
			disabled={disabled}
			onClick={onClick}
			className={cn("gap-2 px-2 py-1.5", active && "bg-accent/60")}
		>
			<Icon className="size-4" />
			<span>{label}</span>
		</DropdownMenuItem>
	);
}

function RichTextToolbar({ editor }: { editor: Editor }) {
	const activeHeading = HEADINGS.find(({ level }) =>
		editor.isActive("heading", { level }),
	);
	const activeAlignment = ALIGNMENTS.find(({ value }) =>
		editor.isActive({ textAlign: value }),
	);
	const inTable = editor.isActive("table");

	const setLink = () => {
		const current = editor.getAttributes("link").href as string | undefined;
		const href = window.prompt("Link URL", current ?? "https://");

		// A dismissed prompt returns null and must leave the document alone, which is
		// not the same as an empty string — that means "remove the link".
		if (href === null) return;

		if (href === "") {
			editor.chain().focus().extendMarkRange("link").unsetLink().run();
			return;
		}

		editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
	};

	return (
		<div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 px-1.5 py-1">
			<div className="flex items-center gap-0.5">
				<ToolbarButton
					label="Undo"
					icon={Undo2}
					disabled={!editor.can().undo()}
					onClick={() => editor.chain().focus().undo().run()}
				/>
				<ToolbarButton
					label="Redo"
					icon={Redo2}
					disabled={!editor.can().redo()}
					onClick={() => editor.chain().focus().redo().run()}
				/>
			</div>

			<Separator orientation="vertical" className="mx-0.5 h-5" />

			<div className="flex items-center gap-0.5">
				<ToolbarMenu
					label="Text style"
					icon={activeHeading?.icon ?? Pilcrow}
					active={!!activeHeading}
				>
					<MenuItem
						label="Paragraph"
						icon={Pilcrow}
						active={editor.isActive("paragraph")}
						onClick={() => editor.chain().focus().setParagraph().run()}
					/>
					{HEADINGS.map(({ level, label, icon }) => (
						<MenuItem
							key={level}
							label={label}
							icon={icon}
							active={editor.isActive("heading", { level })}
							onClick={() =>
								editor.chain().focus().toggleHeading({ level }).run()
							}
						/>
					))}
				</ToolbarMenu>

				<ToolbarMenu
					label="List"
					icon={editor.isActive("orderedList") ? ListOrdered : List}
					active={
						editor.isActive("bulletList") || editor.isActive("orderedList")
					}
				>
					<MenuItem
						label="Bulleted list"
						icon={List}
						active={editor.isActive("bulletList")}
						onClick={() => editor.chain().focus().toggleBulletList().run()}
					/>
					<MenuItem
						label="Numbered list"
						icon={ListOrdered}
						active={editor.isActive("orderedList")}
						onClick={() => editor.chain().focus().toggleOrderedList().run()}
					/>
				</ToolbarMenu>

				<ToolbarMenu
					label="Align"
					icon={activeAlignment?.icon ?? AlignLeft}
					active={!!activeAlignment && activeAlignment.value !== "left"}
				>
					{ALIGNMENTS.map(({ value, label, icon }) => (
						<MenuItem
							key={value}
							label={label}
							icon={icon}
							active={editor.isActive({ textAlign: value })}
							onClick={() => editor.chain().focus().setTextAlign(value).run()}
						/>
					))}
				</ToolbarMenu>
			</div>

			<Separator orientation="vertical" className="mx-0.5 h-5" />

			<div className="flex items-center gap-0.5">
				<ToolbarButton
					label="Bold"
					icon={Bold}
					pressed={editor.isActive("bold")}
					onClick={() => editor.chain().focus().toggleBold().run()}
				/>
				<ToolbarButton
					label="Italic"
					icon={Italic}
					pressed={editor.isActive("italic")}
					onClick={() => editor.chain().focus().toggleItalic().run()}
				/>
				<ToolbarButton
					label="Underline"
					icon={Underline}
					pressed={editor.isActive("underline")}
					onClick={() => editor.chain().focus().toggleUnderline().run()}
				/>
				<ToolbarButton
					label="Strikethrough"
					icon={Strikethrough}
					pressed={editor.isActive("strike")}
					onClick={() => editor.chain().focus().toggleStrike().run()}
				/>
			</div>

			<Separator orientation="vertical" className="mx-0.5 h-5" />

			<ToolbarMenu label="More" icon={Ellipsis}>
				<MenuItem
					label={editor.isActive("link") ? "Edit link" : "Add link"}
					icon={Link2}
					active={editor.isActive("link")}
					onClick={setLink}
				/>
				<MenuItem
					label="Remove link"
					icon={Link2Off}
					disabled={!editor.isActive("link")}
					onClick={() => editor.chain().focus().unsetLink().run()}
				/>

				<DropdownMenuSeparator />

				<MenuItem
					label="Quote"
					icon={Quote}
					active={editor.isActive("blockquote")}
					onClick={() => editor.chain().focus().toggleBlockquote().run()}
				/>
				<MenuItem
					label="Inline code"
					icon={Code}
					active={editor.isActive("code")}
					onClick={() => editor.chain().focus().toggleCode().run()}
				/>
				<MenuItem
					label="Code block"
					icon={SquareCode}
					active={editor.isActive("codeBlock")}
					onClick={() => editor.chain().focus().toggleCodeBlock().run()}
				/>
				<MenuItem
					label="Divider"
					icon={Minus}
					onClick={() => editor.chain().focus().setHorizontalRule().run()}
				/>

				<DropdownMenuSeparator />

				<MenuItem
					label="Insert table"
					icon={TableIcon}
					onClick={() =>
						editor
							.chain()
							.focus()
							.insertTable({ rows: 3, cols: 3, withHeaderRow: true })
							.run()
					}
				/>
				{/* Only meaningful with the caret inside a table, and misleading otherwise. */}
				{inTable && (
					<>
						<MenuItem
							label="Add row"
							icon={Rows3}
							onClick={() => editor.chain().focus().addRowAfter().run()}
						/>
						<MenuItem
							label="Add column"
							icon={Columns3}
							onClick={() => editor.chain().focus().addColumnAfter().run()}
						/>
						<MenuItem
							label="Delete row"
							icon={Rows3}
							onClick={() => editor.chain().focus().deleteRow().run()}
						/>
						<MenuItem
							label="Delete column"
							icon={Columns3}
							onClick={() => editor.chain().focus().deleteColumn().run()}
						/>
						<MenuItem
							label="Delete table"
							icon={Trash2}
							onClick={() => editor.chain().focus().deleteTable().run()}
						/>
					</>
				)}
			</ToolbarMenu>
		</div>
	);
}

export default function RichTextField({ field }: { field: FormFieldType }) {
	const isEditable = !(field?.disabled || field?.readonly);

	const editor = useEditor({
		// The app is server-rendered; the editor must not render during SSR or it
		// would mismatch on hydration.
		immediatelyRender: false,
		editable: isEditable,
		extensions: [
			StarterKit.configure({
				heading: { levels: [1, 2, 3, 4] },
				link: {
					openOnClick: false,
					autolink: true,
					defaultProtocol: "https",
				},
			}),
			Placeholder.configure({ placeholder: field?.placeholder || "" }),
			TextAlign.configure({ types: ["heading", "paragraph"] }),
			// Column resizing writes a `colwidth` attribute and a `<colgroup>`, which
			// the sanitizer would strip on save — so the handle would appear to work
			// and then silently lose its width.
			TableKit.configure({ table: { resizable: false } }),
		],
		content: field?.value || "",
		onUpdate: ({ editor: instance }) => {
			field?.handleChange(normalizeRichText(instance.getHTML()));
		},
		onBlur: () => {
			field?.handleBlur?.();
		},
		editorProps: {
			attributes: {
				id: field?.name ?? "",
				class: cn(
					richTextProseClass,
					"min-h-30 w-full px-3 py-2 text-sm outline-none",
				),
			},
		},
	});

	// `FormComponent` seeds an edit form asynchronously via `form.setFieldValue`,
	// so the value can arrive after the editor is already mounted. Comparing before
	// writing keeps every keystroke from resetting the document and dropping the
	// caret to the start.
	useEffect(() => {
		if (!editor || editor.isDestroyed) return;

		const incoming = normalizeRichText(field?.value ?? "");
		if (incoming === normalizeRichText(editor.getHTML())) return;

		editor.commands.setContent(incoming, { emitUpdate: false });
	}, [editor, field?.value]);

	useEffect(() => {
		if (!editor || editor.isDestroyed) return;
		if (editor.isEditable !== isEditable) editor.setEditable(isEditable);
	}, [editor, isEditable]);

	return (
		<div
			aria-invalid={!field?.isValid}
			aria-describedby={field?.ariaDescribedBy}
			data-disabled={field?.disabled || undefined}
			className={cn(
				"w-full overflow-hidden rounded-md border bg-transparent shadow-xs transition-[color,box-shadow]",
				"focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
				"aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
				"data-disabled:pointer-events-none data-disabled:opacity-50",
			)}
		>
			{editor && isEditable && <RichTextToolbar editor={editor} />}
			<EditorContent editor={editor} />
		</div>
	);
}
