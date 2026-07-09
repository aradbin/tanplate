import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import AvatarComponent from "@/components/common/avatar-component";
import { Card, CardContent } from "@/components/ui/card";
import type { OptionType } from "@/lib/types";
import { capitalize } from "@/lib/utils";
import { Badge } from "../ui/badge";

export default function ProfileComponent({
	profile,
	footer,
}: {
	profile: OptionType & {
		tag?: string | ReactNode;
		tagVariant?: "default" | "destructive";
		items?: { icon: LucideIcon; value: string }[];
	};
	footer?: ReactNode;
}) {
	return (
		<Card>
			<CardContent className="relative space-y-4">
				<div className="flex flex-col items-center gap-2">
					<AvatarComponent
						user={profile}
						options={{ hideAll: true, avatarFallbackClassNames: "text-xl" }}
						classNames="size-20"
					/>
					<div className="flex flex-col items-center gap-2">
						<h1 className="text-xl font-semibold">{profile?.name}</h1>
						{profile?.tag &&
							(typeof profile?.tag === "string" ? (
								<Badge variant={profile?.tagVariant || "default"}>
									{capitalize(profile?.tag)}
								</Badge>
							) : (
								profile?.tag
							))}
					</div>
				</div>

				{profile?.items?.length && (
					<div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
						{profile?.items?.map((item) => (
							<div key={item.value} className="flex items-center gap-1">
								<item.icon className="size-4" />
								<span>{item.value}</span>
							</div>
						))}
					</div>
				)}

				{footer && footer}
			</CardContent>
		</Card>
	);
}
