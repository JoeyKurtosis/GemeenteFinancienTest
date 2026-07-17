"use client";

import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, FilterFunnel01 } from "@untitledui/icons";
import { Button as AriaButton, Dialog as AriaDialog, DialogTrigger as AriaDialogTrigger, Popover as AriaPopover } from "react-aria-components";
import Logo from "@/assets/icons/logo_venster.svg?react";
import LogoMini from "@/assets/icons/logo_venster_mobile.svg?react";
import { Tooltip } from "@/components/base/tooltip/tooltip";
import { useFilters } from "@/features/filters";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { cx } from "@/utils/cx";
import { MobileNavigationHeader } from "../base-components/mobile-header";
import { NavAccountCard } from "../base-components/nav-account-card";
import { NavButton } from "../base-components/nav-button";
import { NavItemBase } from "../base-components/nav-item";
import { NavList } from "../base-components/nav-list";
import { SidebarFilters, type SidebarFiltersState } from "../base-components/sidebar-filters";
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

    // Filter state lives in FiltersProvider (mounted in the layout) so the pages can read
    // it too, and so the inline (expanded) and popover (collapsed) renderings stay in sync.
    const {
        selectedGemeente,
        onGemeenteChange,
        selectedReferentiegroepen,
        onReferentiegroepenChange,
        selectedInwonergroepen,
        onInwonergroepenChange,
        selectedVerslagsoort,
        onVerslagsoortChange,
        selectedJaar,
        onJaarChange,
        reservemutaties,
        onReservemutatiesChange,
    } = useFilters();

    const filterState: SidebarFiltersState = {
        selectedGemeente,
        onGemeenteChange,
        selectedReferentiegroepen,
        onReferentiegroepenChange,
        selectedInwonergroepen,
        onInwonergroepenChange,
        selectedVerslagsoort,
        onVerslagsoortChange,
        selectedJaar,
        onJaarChange,
        reservemutaties,
        onReservemutatiesChange,
    };

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

                        <AriaDialogTrigger>
                            <Tooltip title="Filters" placement="right">
                                <AriaButton
                                    aria-label="Filters"
                                    className="group/item flex size-9 cursor-pointer items-center justify-center rounded-md bg-primary shadow-xs ring-1 ring-primary outline-focus-ring transition duration-100 ease-linear select-none ring-inset hover:bg-primary_hover focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2"
                                >
                                    <FilterFunnel01
                                        aria-hidden="true"
                                        className="size-5 shrink-0 text-fg-quaternary transition-inherit-all group-hover/item:text-fg-quaternary_hover"
                                    />
                                </AriaButton>
                            </Tooltip>
                            <AriaPopover placement="right top" offset={8} crossOffset={-4} className={popoverAnimation}>
                                <AriaDialog className="w-72 rounded-xl bg-primary p-4 shadow-lg ring-1 ring-secondary outline-hidden">
                                    {({ close }) => <SidebarFilters {...filterState} onApply={close} />}
                                </AriaDialog>
                            </AriaPopover>
                        </AriaDialogTrigger>
                    </>
                ) : (
                    <>
                        <Link to="/" search={true} aria-label="Home">
                            <Logo className="h-11.25 text-[#133556] dark:text-white" />
                        </Link>

                        <AriaDialogTrigger>
                            <AriaButton className="group/item flex w-full cursor-pointer items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-secondary shadow-xs ring-1 ring-primary outline-focus-ring transition duration-100 ease-linear select-none ring-inset hover:bg-primary_hover hover:text-secondary_hover focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2">
                                <FilterFunnel01
                                    aria-hidden="true"
                                    className="size-5 shrink-0 text-fg-quaternary transition-inherit-all group-hover/item:text-fg-quaternary_hover"
                                />
                                Filters
                            </AriaButton>
                            <AriaPopover placement="bottom left" offset={8} className={popoverAnimation}>
                                <AriaDialog className="w-72 rounded-xl bg-primary p-4 shadow-lg ring-1 ring-secondary outline-hidden">
                                    {({ close }) => <SidebarFilters {...filterState} onApply={close} />}
                                </AriaDialog>
                            </AriaPopover>
                        </AriaDialogTrigger>
                    </>
                )}
            </div>

            {/* Scrollable middle: nav list. Filters live in the header popover. */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
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
