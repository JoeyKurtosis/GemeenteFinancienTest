import type { RefAttributes } from "react";
import type { PopoverProps as AriaPopoverProps } from "react-aria-components";
import { Popover as AriaPopover } from "react-aria-components";
import { cx } from "@/utils/cx";

interface PopoverProps extends AriaPopoverProps, RefAttributes<HTMLElement> {
    size: "sm" | "md" | "lg";
    /**
     * Whether the popover scrolls its own content.
     *
     * True for a list short enough to render whole. A virtualized list has to be its own scroll
     * container — it works out which rows to build from that container's height and scroll
     * offset — so it turns this off and carries the height itself. Two scrollers nested one
     * inside the other would leave it measuring a box that never moves.
     */
    isScrollable?: boolean;
}

export const Popover = ({ isScrollable = true, ...props }: PopoverProps) => {
    return (
        <AriaPopover
            placement="bottom"
            containerPadding={0}
            offset={4}
            {...props}
            className={(state) =>
                cx(
                    "w-(--trigger-width) origin-(--trigger-anchor-point) rounded-lg bg-primary py-1 shadow-lg ring-1 ring-secondary_alt outline-hidden will-change-transform",
                    isScrollable && "overflow-x-hidden overflow-y-auto",

                    state.isEntering &&
                        "duration-150 ease-out animate-in fade-in placement-right:slide-in-from-left-0.5 placement-top:slide-in-from-bottom-0.5 placement-bottom:slide-in-from-top-0.5",
                    state.isExiting &&
                        "duration-100 ease-in animate-out fade-out placement-right:slide-out-to-left-0.5 placement-top:slide-out-to-bottom-0.5 placement-bottom:slide-out-to-top-0.5",

                    isScrollable && props.size === "sm" && "max-h-56!",
                    isScrollable && props.size === "md" && "max-h-64!",
                    isScrollable && props.size === "lg" && "max-h-80!",

                    typeof props.className === "function" ? props.className(state) : props.className,
                )
            }
        />
    );
};
