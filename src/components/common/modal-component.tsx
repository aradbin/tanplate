import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

export default function ModalComponent({
	children,
	trigger,
	variant = "default",
	options,
}: {
	children: ReactNode | ((props: { close: () => void }) => ReactNode);
	trigger?: ReactNode;
	variant?: "default" | "responsive" | "sheet";
	options?: {
		header?: string;
		description?: string;
		isOpen?: boolean;
		showCloseButton?: boolean;
		onClose?: () => void;
	};
}) {
	const isControlled = options?.isOpen !== undefined;
	// Always start closed so Base UI runs the closed→open transition on mount.
	// Passing `open={true}` on the first render (as the modal stack does) makes
	// the popup appear already-open, which skips the enter animation.
	const [open, setOpen] = useState(false);
	const isMobile = useIsMobile();

	// For controlled (modal-stack) usage, open after mount to animate the entrance.
	useEffect(() => {
		if (isControlled) {
			setOpen(Boolean(options?.isOpen));
		}
	}, [isControlled, options?.isOpen]);

	const handleOpenChange = useCallback((state: boolean) => {
		setOpen(state);
	}, []);

	// Fires once the enter/exit animation has finished. Deferring `onClose`
	// (which unmounts the modal via the stack) to here lets the exit animation
	// play instead of being cut off by an immediate unmount.
	const handleOpenChangeComplete = useCallback(
		(isOpen: boolean) => {
			if (!isOpen) {
				options?.onClose?.();
			}
		},
		[options],
	);

	const close = useCallback(() => {
		setOpen(false);
	}, []);

	const renderContent = useMemo(
		() => (typeof children === "function" ? children({ close }) : children),
		[children, close],
	);

	const header = options?.header;
	const description = options?.description;

	const renderHeader = (
		Title: typeof DialogTitle | typeof DrawerTitle | typeof SheetTitle,
		Description:
			| typeof DialogDescription
			| typeof DrawerDescription
			| typeof SheetDescription,
		Header: typeof DialogHeader | typeof DrawerHeader | typeof SheetHeader,
		className?: string,
	) => (
		<Header className={className}>
			<Title className={header ? undefined : "sr-only"}>
				{header ?? "Modal"}
			</Title>
			{description && <Description>{description}</Description>}
		</Header>
	);

	const renderDialog = (
		<Dialog
			open={open}
			onOpenChange={handleOpenChange}
			onOpenChangeComplete={handleOpenChangeComplete}
		>
			<DialogTrigger>{trigger}</DialogTrigger>
			<DialogContent
				showCloseButton={options?.showCloseButton}
				className="max-h-[85vh] overflow-y-auto"
			>
				{renderHeader(DialogTitle, DialogDescription, DialogHeader)}
				{renderContent}
			</DialogContent>
		</Dialog>
	);

	const renderDrawer = (
		<Drawer
			open={open}
			onOpenChange={handleOpenChange}
			onOpenChangeComplete={handleOpenChangeComplete}
		>
			<DrawerTrigger>{trigger}</DrawerTrigger>
			<DrawerContent>
				{renderHeader(
					DrawerTitle,
					DrawerDescription,
					DrawerHeader,
					"text-left",
				)}
				<div className="p-5 pt-0">{renderContent}</div>
			</DrawerContent>
		</Drawer>
	);

	const renderSheet = (
		<Sheet
			open={open}
			onOpenChange={handleOpenChange}
			onOpenChangeComplete={handleOpenChangeComplete}
		>
			<SheetTrigger>{trigger}</SheetTrigger>
			<SheetContent className="overflow-y-auto">
				{renderHeader(SheetTitle, SheetDescription, SheetHeader)}
				<div className="p-5 pt-0">{renderContent}</div>
			</SheetContent>
		</Sheet>
	);

	if (variant === "sheet") {
		return renderSheet;
	}

	if (variant === "responsive" && isMobile) {
		return renderDrawer;
	}

	return renderDialog;
}
