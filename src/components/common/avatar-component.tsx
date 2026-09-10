import { Link } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { designationOf } from "@/lib/organization/person";
import type { OptionType } from "@/lib/types";
import { getInitials } from "@/lib/utils";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "../ui/hover-card";

const profileLinks = {
	user: "/settings/members/$email",
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
		inline?: boolean;
		avatarFallbackClassNames?: string;
	};
}) {
	const designation = designationOf(user);

	const renderAvatar = (size?: "sm" | "lg") => (
		<Avatar size={size} className={`hover:z-10 ${classNames}`}>
			<AvatarImage src={user?.image || ""} alt={user?.name} />
			<AvatarFallback
				className={`text-primary ${options?.avatarFallbackClassNames}`}
			>
				{getInitials(user?.name)}
			</AvatarFallback>
		</Avatar>
	);

	const renderWithLink = (children: ReactElement): ReactElement =>
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

	// A combobox trigger is a fixed-height, single-line box, so the stacked
	// variant overflows it. This one keeps the name and designation on one line
	// and drops the email, which the open list still shows.
	if (options?.inline) {
		return renderWithLink(
			<div className="flex min-w-0 items-center gap-2">
				{renderAvatar("sm")}
				<span className="truncate text-sm font-medium">{user?.name}</span>
				{designation && (
					<span className="truncate text-xs text-muted-foreground">
						{designation}
					</span>
				)}
			</div>,
		);
	}

	if (options?.hideBody) {
		return (
			<HoverCard>
				<HoverCardTrigger
					delay={10}
					closeDelay={10}
					render={renderWithLink(renderAvatar())}
				/>
				<HoverCardContent className="flex min-w-64 flex-col gap-0.5" side="top">
					{renderWithLink(
						<div className="flex items-center gap-2">
							{renderAvatar()}
							<div className="flex flex-col text-left overflow-hidden">
								<p className="text-sm font-medium truncate">{user?.name}</p>
								{designation && (
									<p className="text-xs text-muted-foreground font-medium truncate">
										{designation}
									</p>
								)}
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
				<p className="truncate text-sm font-medium">{user?.name}</p>
				{designation && (
					<p className="text-xs text-muted-foreground font-medium truncate">
						{designation}
					</p>
				)}
				{!options?.hideDescription && (user?.email || user?.phone) && (
					<p className="text-xs text-muted-foreground font-semibold truncate">
						{user?.email || user?.phone}
					</p>
				)}
			</div>
		</div>,
	);
}
