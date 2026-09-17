import type { ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { HomeLine } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { usePeriodeLabel } from "@/features/filters";
import type { RouteAction } from "@/hooks/use-route-metadata";

const BREADCRUMB_LABELS: Record<string, string> = {
    dashboard: "Dashboard",
};

interface PageHeaderProps {
    title?: string;
    description?: string;
    children?: ReactNode;
    showBreadCrumbs?: boolean;
    actions?: RouteAction[];
    crumbLabels?: Record<string, string>;
}

export function PageHeader({ title, description, children, showBreadCrumbs = true, actions, crumbLabels }: PageHeaderProps) {
    const router = useRouter();
    const pathname = router.state.location.pathname;
    const pathParts = pathname.split("/").filter(Boolean);
    const isHome = pathname === "/";
    // Which report the figures below are drawn from, or null where the page draws from none.
    // The title only — the breadcrumb below names the page, not the selection, and the browser
    // tab (useDocumentTitle in _layout) stays put as the year is changed.
    const periode = usePeriodeLabel();

    return (
        <div className="mb-8">
            {!isHome && showBreadCrumbs && (
                <nav aria-label="Broodkruimelpad" className="mb-5 max-md:hidden">
                    <ol className="flex items-center gap-1.5 text-sm">
                        <li>
                            <Link
                                to="/"
                                search={true}
                                aria-label="Home"
                                className="flex size-6 items-center justify-center rounded-sm text-fg-tertiary outline-focus-ring transition duration-100 hover:text-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
                            >
                                <HomeLine aria-hidden="true" className="size-4" />
                            </Link>
                        </li>
                        {pathParts.map((part, index) => {
                            const path = "/" + pathParts.slice(0, index + 1).join("/");
                            const isLast = index === pathParts.length - 1;
                            const label = isLast
                                ? (title ?? crumbLabels?.[part] ?? BREADCRUMB_LABELS[part] ?? part.charAt(0).toUpperCase() + part.slice(1))
                                : (crumbLabels?.[part] ?? BREADCRUMB_LABELS[part] ?? part.charAt(0).toUpperCase() + part.slice(1));

                            return (
                                <li key={path} className="flex items-center gap-1.5">
                                    <span className="text-fg-quaternary">/</span>
                                    {isLast ? (
                                        <span className="font-semibold text-tertiary">{label}</span>
                                    ) : (
                                        <Link
                                            to={path}
                                            search={true}
                                            // An ancestor crumb is never the current page — the current
                                            // one is the <span> above. Without `exact`, Link's prefix
                                            // matching would force aria-current="page" onto it as well.
                                            activeOptions={{ exact: true }}
                                            className="font-semibold text-tertiary transition duration-100 hover:text-secondary"
                                        >
                                            {label}
                                        </Link>
                                    )}
                                </li>
                            );
                        })}
                    </ol>
                </nav>
            )}

            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold text-primary md:text-display-xs">
                        {isHome ? (
                            <>
                                <span className="text-brand-700 dark:text-brand-500">Gemeente</span>
                                <span>financiën</span>
                            </>
                        ) : (
                            <>
                                {title}
                                {periode && <span className="font-normal text-tertiary"> ({periode})</span>}
                            </>
                        )}
                    </h1>
                    {description && <p className="mt-1 text-sm text-tertiary md:text-md">{description}</p>}
                    {children && <div className="mt-1 text-sm text-tertiary">{children}</div>}
                </div>

                {actions && actions.length > 0 && (
                    <div className="flex flex-wrap justify-end gap-2">
                        {actions.map((action, i) =>
                            action.href ? (
                                <Button
                                    key={i}
                                    href={action.href}
                                    color={action.variant === "secondary" ? "secondary" : "primary"}
                                    iconLeading={action.iconPosition !== "right" ? action.icon : undefined}
                                    iconTrailing={action.iconPosition === "right" ? action.icon : undefined}
                                    isDisabled={action.disabled}
                                >
                                    {action.label}
                                </Button>
                            ) : (
                                <Button
                                    key={i}
                                    color={action.variant === "secondary" ? "secondary" : "primary"}
                                    iconLeading={action.iconPosition !== "right" ? action.icon : undefined}
                                    iconTrailing={action.iconPosition === "right" ? action.icon : undefined}
                                    isDisabled={action.disabled}
                                    onPress={action.onClick}
                                >
                                    {action.label}
                                </Button>
                            ),
                        )}
                    </div>
                )}
            </div>

            <div className="mt-5 border-b border-secondary" />
        </div>
    );
}
