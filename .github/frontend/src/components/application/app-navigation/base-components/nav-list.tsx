"use client";

import { useState } from "react";
import {
    Button as AriaButton,
    DialogTrigger as AriaDialogTrigger,
    Popover as AriaPopover,
} from "react-aria-components";
import { Tooltip } from "@/components/base/tooltip/tooltip";
import { cx } from "@/utils/cx";
import type { NavItemDividerType, NavItemType } from "../config";
import { NavButton } from "./nav-button";
import { NavItemBase } from "./nav-item";

interface NavListProps {
    /** URL of the currently active item. */
    activeUrl?: string;
    /** Additional CSS classes to apply to the list. */
    className?: string;
    /** List of items to display. */
    items: (NavItemType | NavItemDividerType)[];
    /** Whether to render the compact icon-only rail. */
    collapsed?: boolean;
}

const popoverClassName = ({ isEntering, isExiting }: { isEntering: boolean; isExiting: boolean }) =>
    cx(
        "will-change-transform",
        isEntering &&
            "animate-in duration-150 ease-out fade-in placement-right:slide-in-from-left-0.5",
        isExiting && "animate-out duration-100 ease-in fade-out placement-right:slide-out-to-left-0.5",
    );

/** Collapsed icon trigger that opens a flyout popover listing a group's sub-items. */
const CollapsedNavGroup = ({ item, activeUrl }: { item: NavItemType; activeUrl?: string }) => {
    const Icon = item.icon;
    const isCurrent = item.items?.some((subItem) => subItem.href === activeUrl);

    return (
        <AriaDialogTrigger>
            <Tooltip title={item.label} placement="right">
                <AriaButton
                    aria-label={item.label}
                    className={cx(
                        "group/item relative flex size-9 cursor-pointer items-center justify-center rounded-md bg-primary outline-focus-ring transition duration-100 ease-linear select-none hover:bg-primary_hover focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2",
                        isCurrent && "bg-secondary hover:bg-secondary_hover",
                    )}
                >
                    {Icon && (
                        <Icon
                            aria-hidden="true"
                            className={cx(
                                "size-5 shrink-0 text-fg-quaternary transition-inherit-all group-hover/item:text-fg-quaternary_hover",
                                isCurrent && "text-fg-quaternary_hover",
                            )}
                        />
                    )}
                </AriaButton>
            </Tooltip>

            <AriaPopover placement="right top" offset={8} crossOffset={-4} className={popoverClassName}>
                <div className="min-w-56 rounded-xl bg-primary p-2 shadow-lg ring-1 ring-secondary">
                    <p className="px-2 py-1.5 text-sm font-semibold text-brand-secondary">{item.label}</p>
                    <ul className="flex flex-col">
                        {item.items?.map((childItem) => (
                            <li key={childItem.label} className="py-px">
                                <NavItemBase
                                    href={childItem.href}
                                    badge={childItem.badge}
                                    icon={childItem.icon}
                                    type="link"
                                    current={activeUrl === childItem.href}
                                >
                                    {childItem.label}
                                </NavItemBase>
                            </li>
                        ))}
                    </ul>
                </div>
            </AriaPopover>
        </AriaDialogTrigger>
    );
};

export const NavList = ({ activeUrl, items, className, collapsed = false }: NavListProps) => {
    const [open, setOpen] = useState(false);
    const activeItem = items.find((item) => item.href === activeUrl || item.items?.some((subItem) => subItem.href === activeUrl));
    const [currentItem, setCurrentItem] = useState(activeItem);

    if (collapsed) {
        return (
            <ul className={cx("flex flex-col items-center gap-0.5 px-3 pt-5", className)}>
                {items.map((item, index) => {
                    if (item.divider) {
                        return (
                            <li key={index} className="w-full px-2 py-2">
                                <hr className="h-px w-full border-none bg-border-secondary" />
                            </li>
                        );
                    }

                    if (item.items?.length) {
                        return (
                            <li key={item.label} className="py-px">
                                <CollapsedNavGroup item={item} activeUrl={activeUrl} />
                            </li>
                        );
                    }

                    return (
                        <li key={item.label} className="py-px">
                            <NavButton current={activeUrl === item.href} href={item.href} label={item.label} icon={item.icon} />
                        </li>
                    );
                })}
            </ul>
        );
    }

    return (
        <ul className={cx("flex flex-col px-4 pt-5", className)}>
            {items.map((item, index) => {
                if (item.divider) {
                    return (
                        <li key={index} className="w-full px-0.5 py-2">
                            <hr className="h-px w-full border-none bg-border-secondary" />
                        </li>
                    );
                }

                if (item.items?.length) {
                    return (
                        <details
                            key={item.label}
                            open={activeItem?.href === item.href}
                            className="appearance-none py-0.25"
                            onToggle={(e) => {
                                setOpen(e.currentTarget.open);
                                setCurrentItem(item);
                            }}
                        >
                            <NavItemBase href={item.href} badge={item.badge} icon={item.icon} type="collapsible">
                                {item.label}
                            </NavItemBase>

                            <dd>
                                <ul className="pb-1">
                                    {item.items.map((childItem) => (
                                        <li key={childItem.label} className="py-0.25">
                                            <NavItemBase
                                                href={childItem.href}
                                                badge={childItem.badge}
                                                type="collapsible-child"
                                                current={activeUrl === childItem.href}
                                            >
                                                {childItem.label}
                                            </NavItemBase>
                                        </li>
                                    ))}
                                </ul>
                            </dd>
                        </details>
                    );
                }

                return (
                    <li key={item.label} className="py-px">
                        <NavItemBase
                            type="link"
                            badge={item.badge}
                            icon={item.icon}
                            href={item.href}
                            current={activeUrl === item.href}
                            open={open && currentItem?.href === item.href}
                        >
                            {item.label}
                        </NavItemBase>
                    </li>
                );
            })}
        </ul>
    );
};
