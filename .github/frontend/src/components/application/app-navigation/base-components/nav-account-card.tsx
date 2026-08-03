"use client";

import type { FC, HTMLAttributes, MouseEventHandler } from "react";
import { useCallback, useEffect, useRef } from "react";
import type { Placement } from "@react-types/overlays";
import { Link } from "@tanstack/react-router";
import { ChevronSelectorVertical, LogIn01, LogOut01, Moon01, User01 } from "@untitledui/icons";
import { useFocusManager } from "react-aria";
import type { DialogProps as AriaDialogProps } from "react-aria-components";
import { Button as AriaButton, Dialog as AriaDialog, DialogTrigger as AriaDialogTrigger, Popover as AriaPopover } from "react-aria-components";
import { Avatar } from "@/components/base/avatar/avatar";
import { AvatarLabelGroup } from "@/components/base/avatar/avatar-label-group";
import { Button } from "@/components/base/buttons/button";
import { Toggle } from "@/components/base/toggle/toggle";
import { useAuth } from "@/features/auth";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { useTheme } from "@/providers/theme-provider";
import { cx } from "@/utils/cx";

export const NavAccountMenu = ({ className, onLogout, ...dialogProps }: AriaDialogProps & { className?: string; onLogout?: () => void }) => {
    const focusManager = useFocusManager();
    const dialogRef = useRef<HTMLDivElement>(null);
    const { theme, setTheme } = useTheme();

    const onKeyDown = useCallback(
        (e: KeyboardEvent) => {
            switch (e.key) {
                case "ArrowDown":
                    focusManager?.focusNext({ tabbable: true, wrap: true });
                    break;
                case "ArrowUp":
                    focusManager?.focusPrevious({ tabbable: true, wrap: true });
                    break;
            }
        },
        [focusManager],
    );

    useEffect(() => {
        const element = dialogRef.current;
        if (element) {
            element.addEventListener("keydown", onKeyDown);
        }

        return () => {
            if (element) {
                element.removeEventListener("keydown", onKeyDown);
            }
        };
    }, [onKeyDown]);

    const isDark = theme === "dark";

    return (
        <AriaDialog
            {...dialogProps}
            ref={dialogRef}
            className={cx("w-66 rounded-xl bg-secondary_alt shadow-lg ring ring-secondary_alt outline-hidden", className)}
        >
            <div className="rounded-xl bg-primary ring-1 ring-secondary">
                <div className="flex flex-col gap-0.5 py-1.5">
                    <div className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                            <Moon01 className="size-5 text-fg-quaternary" />
                            Dark mode
                        </div>
                        <Toggle size="sm" isSelected={isDark} onChange={(selected) => setTheme(selected ? "dark" : "light")} aria-label="Dark mode" />
                    </div>
                </div>
                {onLogout ? (
                    <>
                        <div className="border-t border-secondary pt-0.5 pb-1.5">
                            <NavAccountCardMenuItem label="Account" icon={User01} href="/account" />
                        </div>
                        <div className="border-t border-secondary pt-0.5 pb-1.5">
                            <NavAccountCardMenuItem label="Uitloggen" icon={LogOut01} onClick={onLogout} />
                        </div>
                    </>
                ) : (
                    <div className="border-t border-secondary pt-0.5 pb-1.5">
                        <NavAccountCardMenuItem label="Inloggen" icon={LogIn01} href="/login" />
                    </div>
                )}
            </div>
        </AriaDialog>
    );
};

const NavAccountCardMenuItem = ({
    icon: Icon,
    label,
    shortcut,
    href,
    ...buttonProps
}: {
    icon?: FC<{ className?: string }>;
    label: string;
    shortcut?: string;
    /** When set, the item navigates to this route instead of acting as a button. */
    href?: string;
} & HTMLAttributes<HTMLButtonElement>) => {
    const className = cx("group/item w-full cursor-pointer focus:outline-hidden", buttonProps.className);

    const content = (
        <div
            className={cx(
                "flex w-full items-center justify-between gap-3 rounded-md p-2 group-hover/item:bg-primary_hover",
                // Focus styles.
                "outline-focus-ring group-focus-visible/item:outline-2 group-focus-visible/item:outline-offset-2",
            )}
        >
            <div className="flex gap-2 text-sm font-semibold text-secondary group-hover/item:text-secondary_hover">
                {Icon && <Icon className="size-5 text-fg-quaternary group-hover/item:text-fg-quaternary_hover" />} {label}
            </div>

            {shortcut && <kbd className="flex rounded px-1 py-px font-body text-xs font-medium text-tertiary ring-1 ring-secondary ring-inset">{shortcut}</kbd>}
        </div>
    );

    if (href) {
        return (
            <Link to={href} search={true} className={className} onClick={buttonProps.onClick as MouseEventHandler<HTMLAnchorElement> | undefined}>
                {content}
            </Link>
        );
    }

    return (
        <button {...buttonProps} className={className}>
            {content}
        </button>
    );
};

export const NavAccountCard = ({
    popoverPlacement,
    avatarRounded,
    collapsed = false,
}: {
    popoverPlacement?: Placement;
    avatarRounded?: boolean;
    /** Whether to render a compact avatar-only trigger for the collapsed rail. */
    collapsed?: boolean;
}) => {
    const triggerRef = useRef<HTMLDivElement>(null);
    const isDesktop = useBreakpoint("lg");
    const { user, isAuthenticated, logout } = useAuth();

    const initials = isAuthenticated
        ? [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join("").toUpperCase() || user?.username?.[0]?.toUpperCase() || "?"
        : "?";
    const fullName = isAuthenticated ? [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "" : "Gast";
    const subtitle = isAuthenticated ? user?.email : "Niet ingelogd";

    if (collapsed) {
        return (
            <div ref={triggerRef} className="flex justify-center">
                <AriaDialogTrigger>
                    <AriaButton
                        aria-label="Account"
                        className="flex cursor-pointer rounded-full outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                        <Avatar size="md" src={isAuthenticated ? user?.avatar_url : undefined} initials={initials} alt={fullName} rounded={avatarRounded} />
                    </AriaButton>
                    <AriaPopover
                        placement={popoverPlacement ?? (isDesktop ? "right bottom" : "top right")}
                        triggerRef={triggerRef}
                        offset={8}
                        className={({ isEntering, isExiting }) =>
                            cx(
                                "origin-(--trigger-anchor-point) will-change-transform",
                                isEntering &&
                                    "animate-in duration-150 ease-out fade-in placement-right:slide-in-from-left-0.5 placement-top:slide-in-from-bottom-0.5",
                                isExiting &&
                                    "animate-out duration-100 ease-in fade-out placement-right:slide-out-to-left-0.5 placement-top:slide-out-to-bottom-0.5",
                            )
                        }
                    >
                        <NavAccountMenu onLogout={isAuthenticated ? logout : undefined} />
                    </AriaPopover>
                </AriaDialogTrigger>
            </div>
        );
    }

    return (
        <div ref={triggerRef} className="relative flex items-center gap-3 rounded-xl p-3 ring-1 ring-secondary ring-inset">
            <AvatarLabelGroup
                size="md"
                src={isAuthenticated ? user?.avatar_url : undefined}
                initials={initials}
                title={fullName}
                subtitle={subtitle}
                rounded={avatarRounded}
            />

            <AriaDialogTrigger>
                <AriaButton className="absolute top-2 right-2 flex cursor-pointer items-center justify-center rounded-md p-1.5 text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover hover:text-fg-quaternary_hover focus-visible:outline-2 focus-visible:outline-offset-2 pressed:bg-primary_hover pressed:text-fg-quaternary_hover">
                    <ChevronSelectorVertical className="size-4 shrink-0 stroke-[2.25px]" />
                </AriaButton>
                <AriaPopover
                    placement={popoverPlacement ?? (isDesktop ? "right bottom" : "top right")}
                    triggerRef={triggerRef}
                    offset={8}
                    className={({ isEntering, isExiting }) =>
                        cx(
                            "origin-(--trigger-anchor-point) will-change-transform",
                            isEntering &&
                                "animate-in duration-150 ease-out fade-in placement-right:slide-in-from-left-0.5 placement-top:slide-in-from-bottom-0.5 placement-bottom:slide-in-from-top-0.5",
                            isExiting &&
                                "animate-out duration-100 ease-in fade-out placement-right:slide-out-to-left-0.5 placement-top:slide-out-to-bottom-0.5 placement-bottom:slide-out-to-top-0.5",
                        )
                    }
                >
                    <NavAccountMenu onLogout={isAuthenticated ? logout : undefined} />
                </AriaPopover>
            </AriaDialogTrigger>
        </div>
    );
};
