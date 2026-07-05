import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Shortcut() {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button variant="outline" size="icon" />}>
				<Plus className="h-[1.2rem] w-[1.2rem]" />
				<span className="sr-only">Shortcut</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-40">
				<DropdownMenuGroup>
					<DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
