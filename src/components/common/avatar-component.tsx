import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { OptionType } from "@/lib/types";
import { getInitials } from "@/lib/utils";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "../ui/hover-card";

const profileLinks = {
	user: "/users/$email",
} as const;

export type ProfileType = keyof typeof profileLinks;

export default function AvatarComponent({
	user,
	classNames,
	profile,
	options,
}: {
	user: OptionType;
	classNames?: string;
	profile?: ProfileType;
	options?: {
		hideAll?: boolean;
		hideBody?: boolean;
		hideDescription?: boolean;
		avatarFallbackClassNames?: string;
	};
}) {
	const renderAvatar = () => (
		<Avatar className={`hover:z-10 ${classNames}`}>
			<AvatarImage src={user?.image || ""} alt={user?.name} />
			<AvatarFallback
				className={`text-primary ${options?.avatarFallbackClassNames}`}
			>
				{getInitials(user?.name)}
			</AvatarFallback>
		</Avatar>
	);

	const renderWithLink = (children: ReactNode) =>
		profile && user?.email ? (
			<Link to={profileLinks[profile]} params={{ email: user.email }}>
				{children}
			</Link>
		) : (
			children
		);

	if (options?.hideAll) {
		return renderWithLink(renderAvatar());
	}

	if (options?.hideBody) {
		return (
			<HoverCard>
				<HoverCardTrigger render={renderWithLink(renderAvatar())} />
				<HoverCardContent className="flex min-w-64 flex-col gap-0.5" side="top">
					{renderWithLink(
						<div className="flex items-center gap-2">
							{renderAvatar()}
							<div className="flex flex-col text-left overflow-hidden">
								<p className="text-sm font-medium truncate">{user?.name}</p>
								{!options?.hideDescription && (user?.email || user?.phone) && (
									<p className="text-xs text-muted-foreground font-semibold truncate">
										{user?.email || user?.phone}
									</p>
								)}
							</div>
						</div>,
					)}
				</HoverCardContent>
			</HoverCard>
		);
	}

	return renderWithLink(
		<div className="flex items-center gap-2 min-w-0">
			{renderAvatar()}
			<div className="flex flex-col text-left overflow-hidden">
				<p className={`text-sm font-medium text-wrap break-all`}>
					{user?.name}
				</p>
				{!options?.hideDescription && (user?.email || user?.phone) && (
					<p className="text-xs text-muted-foreground font-semibold truncate">
						{user?.email || user?.phone}
					</p>
				)}
			</div>
		</div>,
	);
}
