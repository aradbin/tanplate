import AvatarComponent, {
	type ProfileType,
} from "@/components/common/avatar-component";
import type { OptionType } from "@/lib/types";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "../ui/hover-card";

export default function AvatarGroupComponent({
	users,
	profile,
}: {
	users: OptionType[];
	profile?: ProfileType;
}) {
	return (
		<div className="flex items-center -space-x-2">
			{users.slice(0, 4).map((user, index) => (
				<AvatarComponent
					key={index}
					user={user}
					profile={profile}
					options={{ hideBody: true }}
				/>
			))}
			{users.length > 4 && (
				<HoverCard>
					<HoverCardTrigger>
						<div>
							<AvatarComponent
								user={{
									id: "",
									name: `+ ${users.length - 4}`,
								}}
								options={{ hideAll: true }}
							/>
						</div>
					</HoverCardTrigger>
					<HoverCardContent side="top">
						<div className="flex flex-col gap-2 min-w-64">
							{users?.slice(4)?.map((user, index) => (
								<AvatarComponent key={index} user={user} profile={profile} />
							))}
						</div>
					</HoverCardContent>
				</HoverCard>
			)}
		</div>
	);
}
