import { Link, useNavigate, useRouteContext } from "@tanstack/react-router";
import { Lock, LogOut, User } from "lucide-react";
import AvatarComponent from "@/components/common/avatar-component";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth/functions";
import { getInitials } from "@/lib/utils";
import { useApp } from "@/providers/app-provider";
import { useAuth } from "@/providers/auth-provider";
import ChangePasswordForm from "@/routes/_auth/-password-form";

export function NavUser() {
	const { user, refetch } = useAuth();
	const navigate = useNavigate();
	const { queryClient } = useRouteContext({ from: "__root__" });
	const { openModal } = useApp();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="outline"
						size="icon"
						className="rounded-lg"
						aria-label="User"
					/>
				}
			>
				<Avatar className="size-9 after:border-none">
					<AvatarImage src={user?.image || ""} alt={user?.name} />
					<AvatarFallback className="bg-transparent text-foreground">
						{getInitials(user?.name)}
					</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-50">
				<DropdownMenuGroup>
					<DropdownMenuLabel className="flex gap-2">
						{user && <AvatarComponent user={user} />}
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem render={<Link to="/" />}>
						<User />
						Profile
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={() => openModal(ChangePasswordForm)}>
						<Lock />
						Change Password
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={async () => {
							const response = await signOut();
							if (response?.success) {
								queryClient.clear();
								await refetch();
								navigate({ to: "/" });
							}
						}}
					>
						<LogOut />
						Log Out
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
