import { Link } from "@tanstack/react-router";
import { Fragment } from "react";

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function Breadcrumbs({
	breadcrumbs,
}: {
	breadcrumbs: {
		title: string;
		href: string;
	}[];
}) {
	return (
		<>
			{breadcrumbs.length > 0 && (
				<Breadcrumb>
					<BreadcrumbList>
						{breadcrumbs.map((item, index) => {
							const isLast = index === breadcrumbs.length - 1;
							return (
								<Fragment key={`${item.href}-${index}`}>
									<BreadcrumbItem>
										{isLast ? (
											<BreadcrumbPage>{item.title}</BreadcrumbPage>
										) : (
											<BreadcrumbLink render={<Link to={item.href} />}>
												{item.title}
											</BreadcrumbLink>
										)}
									</BreadcrumbItem>
									{!isLast && <BreadcrumbSeparator />}
								</Fragment>
							);
						})}
					</BreadcrumbList>
				</Breadcrumb>
			)}
		</>
	);
}
