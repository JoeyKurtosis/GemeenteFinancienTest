import { useMatches } from "@tanstack/react-router";
import type { FC, ReactNode } from "react";

export interface RouteAction {
    label: string;
    icon?: FC;
    iconPosition?: "left" | "right";
    href?: string;
    onClick?: () => void;
    variant?: string;
    disabled?: boolean;
    roles?: string[];
}

export interface RouteMetadata {
    title?: string;
    description?: string;
    showBreadCrumbs: boolean;
    actions?: RouteAction[];
    crumbLabels?: Record<string, string>;
    subContent?: ReactNode;
}

export function useRouteMetadata(): RouteMetadata {
    const matches = useMatches();
    const lastMatch = matches.at(-1);

    const context = lastMatch?.context as Record<string, unknown> | undefined;
    const loaderData = lastMatch?.loaderData as Record<string, unknown> | undefined;

    return {
        title: (loaderData?.title ?? loaderData?.name ?? context?.title) as string | undefined,
        description: (loaderData?.description ?? context?.description) as string | undefined,
        showBreadCrumbs: (context?.showBreadCrumbs as boolean) ?? true,
        actions: context?.actions as RouteAction[] | undefined,
        crumbLabels: (loaderData?.crumbLabels ?? context?.crumbLabels) as Record<string, string> | undefined,
        subContent: context?.subContent as ReactNode | undefined,
    };
}
