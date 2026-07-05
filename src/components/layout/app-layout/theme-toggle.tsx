import { Cpu, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/providers/theme-provider";

export function ThemeToggle() {
	const { theme, setTheme } = useTheme();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button variant="outline" size="icon" />}>
				<Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
				<Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
				<span className="sr-only">Toggle theme</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuGroup>
					<DropdownMenuLabel>Theme</DropdownMenuLabel>
					<DropdownMenuItem
						onClick={() => setTheme("light")}
						className={
							theme === "light" ? "bg-accent text-accent-foreground" : ""
						}
					>
						<Sun /> Light
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => setTheme("dark")}
						className={
							theme === "dark" ? "bg-accent text-accent-foreground" : ""
						}
					>
						<Moon /> Dark
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => setTheme("system")}
						className={
							theme === "system" ? "bg-accent text-accent-foreground" : ""
						}
					>
						<Cpu /> System
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
