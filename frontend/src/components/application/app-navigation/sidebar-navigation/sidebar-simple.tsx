"use client";

import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, FilterFunnel01 } from "@untitledui/icons";
import { Dialog as AriaDialog, DialogTrigger as AriaDialogTrigger, Popover as AriaPopover } from "react-aria-components";
import Logo from "@/assets/icons/logo_venster.svg?react";
import LogoMini from "@/assets/icons/logo_venster_mobile.svg?react";
import { Button } from "@/components/base/buttons/button";
import { Tooltip } from "@/components/base/tooltip/tooltip";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { cx } from "@/utils/cx";
import { MobileNavigationHeader } from "../base-components/mobile-header";
import { NavAccountCard } from "../base-components/nav-account-card";
import { NavButton } from "../base-components/nav-button";
import { NavItemBase } from "../base-components/nav-item";
import { NavList } from "../base-components/nav-list";
import { SidebarFilters } from "../base-components/sidebar-filters";
import type { NavItemType } from "../config";

interface SidebarNavigationProps {
    /** URL of the currently active item. */
    activeUrl?: string;
    /** List of items to display. */
    items: NavItemType[];
    /** List of footer items to display. */
    footerItems?: NavItemType[];
    /** Feature card to display. */
    featureCard?: ReactNode;
    /** Whether to show the account card. */
    showAccountCard?: boolean;
    /** Whether to hide the right side border. */
    hideBorder?: boolean;
    /** Additional CSS classes to apply to the sidebar. */
    className?: string;
    /** Whether to round the account card avatar. */
    avatarRounded?: boolean;
    /** Custom footer content (rendered after account card area). */
    children?: ReactNode;
}

const EXPANDED_WIDTH = 280;
const COLLAPSED_WIDTH = 72;

const popoverAnimation = ({ isEntering, isExiting }: { isEntering: boolean; isExiting: boolean }) =>
    cx(
        "will-change-transform",
        isEntering && "animate-in duration-150 ease-out fade-in placement-right:slide-in-from-left-0.5",
        isExiting && "animate-out duration-100 ease-in fade-out placement-right:slide-out-to-left-0.5",
    );

export const SidebarNavigationSimple = ({
    activeUrl,
    items,
    footerItems = [],
    featureCard,
    showAccountCard = true,
    hideBorder = false,
    className,
    avatarRounded,
    children,
}: SidebarNavigationProps) => {
    const { collapsed, setCollapsed } = useSidebarCollapsed();

    /**
     * @param isCollapsed Render the compact icon rail. Always `false` on mobile.
     */
    const renderSidebar = (isCollapsed: boolean) => (
        <aside
            style={{ "--width": `${isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH}px` } as React.CSSProperties}
            className={cx(
                "flex h-full w-full max-w-full flex-col overflow-hidden bg-primary pt-4 transition-[width] duration-200 ease-in-out lg:w-(--width) lg:pt-5",
                !hideBorder && "border-secondary md:border-r",
                className,
            )}
        >
            {/* Fixed header: logo (and collapsed filter-funnel popover). */}
            <div className={cx("flex shrink-0 flex-col gap-4", isCollapsed ? "items-center px-3" : "px-4 lg:px-5")}>
                {isCollapsed ? (
                    <>
                        <Link to="/" search={true} aria-label="Home">
                            <LogoMini className="h-9 w-auto" />
                        </Link>

                        {/* 72px fits an icon and nothing else, so the rail is the one state where
                            the filters stay behind a button. Expanded they sit in the sidebar. */}
                        <AriaDialogTrigger>
                            <Tooltip title="Filters" placement="right">
                                <Button aria-label="Filters" color="secondary" size="sm" iconLeading={FilterFunnel01} />
                            </Tooltip>
                            <AriaPopover placement="right top" offset={8} crossOffset={-4} className={popoverAnimation}>
                                <AriaDialog className="w-72 rounded-xl bg-primary p-4 shadow-lg ring-1 ring-secondary outline-hidden">
                                    <SidebarFilters />
                                </AriaDialog>
                            </AriaPopover>
                        </AriaDialogTrigger>
                    </>
                ) : (
                    <Link to="/" search={true} aria-label="Home">
                        <Logo className="h-11.25 text-[#133556] dark:text-white" />
                    </Link>
                )}
            </div>

            {/* Scrollable middle: the filters themselves when there is room for them, then the nav
                list. Expanded there is no reason to hide 280px of controls behind a button; the
                rail is the only place they do not fit, and there the funnel popover carries them.

                Here rather than in the fixed header above: the controls are tall enough that a
                short viewport would push the nav list off the bottom, and inside this scroller
                everything stays reachable. */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                {!isCollapsed && (
                    <>
                        <SidebarFilters className="px-4 pt-5 lg:px-5" />
                        <hr className="mx-4 mt-5 h-px border-none bg-border-secondary lg:mx-5" />
                    </>
                )}

                <NavList activeUrl={activeUrl} items={items} collapsed={isCollapsed} />
            </div>

            <div className={cx("flex shrink-0 flex-col gap-3 py-4 lg:py-5", isCollapsed ? "items-center px-3" : "px-4")}>
                {footerItems.length > 0 &&
                    (isCollapsed ? (
                        <ul className="flex flex-col items-center gap-0.5">
                            {footerItems.map((item) => (
                                <li key={item.label} className="py-px">
                                    <NavButton current={item.href === activeUrl} href={item.href} label={item.label} icon={item.icon} />
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <ul className="flex flex-col">
                            {footerItems.map((item) => (
                                <li key={item.label} className="py-px">
                                    <NavItemBase badge={item.badge} icon={item.icon} href={item.href} type="link" current={item.href === activeUrl}>
                                        {item.label}
                                    </NavItemBase>
                                </li>
                            ))}
                        </ul>
                    ))}

                {!isCollapsed && featureCard}

                {showAccountCard && <NavAccountCard collapsed={isCollapsed} avatarRounded={avatarRounded} />}

                {children}
            </div>
        </aside>
    );

    return (
        <>
            {/* Mobile header navigation — always expanded */}
            <MobileNavigationHeader>{renderSidebar(false)}</MobileNavigationHeader>

            {/* Desktop sidebar navigation */}
            <div className="z-50 hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex">
                {renderSidebar(collapsed)}

                {/* Floating collapse/expand toggle, centered on the right edge. */}
                <button
                    type="button"
                    aria-label={collapsed ? "Zijbalk uitklappen" : "Zijbalk inklappen"}
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute top-1/2 right-0 flex size-8 translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-secondary bg-primary text-fg-quaternary shadow-md outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover hover:text-fg-quaternary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                    {collapsed ? (
                        <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
                    ) : (
                        <ChevronLeft aria-hidden="true" className="size-5 shrink-0" />
                    )}
                </button>
            </div>

            {/* Placeholder to take up physical space because the real sidebar has `fixed` position. */}
            <div
                style={{ paddingLeft: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
                className="invisible hidden transition-[padding] duration-200 ease-in-out lg:sticky lg:top-0 lg:bottom-0 lg:left-0 lg:block"
            />
        </>
    );
};
