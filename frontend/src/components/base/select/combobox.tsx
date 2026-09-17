import type { FC, FocusEventHandler, PointerEventHandler, ReactNode, Ref, RefAttributes } from "react";
import { isValidElement, useCallback, useRef, useState } from "react";
import { SearchLg } from "@untitledui/icons";
import type { ComboBoxProps as AriaComboBoxProps, GroupProps as AriaGroupProps, ListBoxProps as AriaListBoxProps } from "react-aria-components";
import {
    ComboBox as AriaComboBox,
    Group as AriaGroup,
    Input as AriaInput,
    ListBox as AriaListBox,
    ListLayout as AriaListLayout,
    Virtualizer as AriaVirtualizer,
} from "react-aria-components";
import { HintText } from "@/components/base/input/hint-text";
import { Label } from "@/components/base/input/label";
import { Popover } from "@/components/base/select/popover";
import { type CommonProps, SelectContext, type SelectItemType, sizes } from "@/components/base/select/select-shared";
import { useResizeObserver } from "@/hooks/use-resize-observer";
import { cx } from "@/utils/cx";
import { isReactComponent } from "@/utils/is-react-component";

/**
 * What the list may grow to, and roughly how tall one row is, per size.
 *
 * The heights are the ones the popover used to clamp itself to; they move onto the listbox
 * because a virtualized list scrolls itself (see Popover's isScrollable).
 *
 * `estimatedRowHeight` rather than a fixed `rowHeight`: it only has to be close, since the
 * layout measures each row it renders and corrects itself. A row is the item's own py-px plus
 * the p-2 (p-2.5 at lg) and line height of the label inside it.
 */
const listSizes = {
    sm: { maxHeight: "max-h-56", estimatedRowHeight: 38 },
    md: { maxHeight: "max-h-64", estimatedRowHeight: 42 },
    lg: { maxHeight: "max-h-80", estimatedRowHeight: 46 },
};

interface ComboBoxProps extends Omit<AriaComboBoxProps<SelectItemType>, "children" | "items">, RefAttributes<HTMLDivElement>, CommonProps {
    shortcut?: boolean;
    items?: SelectItemType[];
    popoverClassName?: string;
    shortcutClassName?: string;
    /** Leading icon component displayed before the input. */
    icon?: FC | ReactNode;
    children: AriaListBoxProps<SelectItemType>["children"];
}

interface ComboBoxValueProps extends AriaGroupProps {
    size: "sm" | "md" | "lg";
    shortcut: boolean;
    placeholder?: string;
    shortcutClassName?: string;
    icon?: FC | ReactNode;
    onFocus?: FocusEventHandler;
    onPointerEnter?: PointerEventHandler;
    ref?: Ref<HTMLDivElement>;
}

const ComboBoxValue = ({ size, shortcut, placeholder, shortcutClassName, icon: IconProp, ref, ...otherProps }: ComboBoxValueProps) => {
    return (
        <AriaGroup
            ref={ref}
            {...otherProps}
            className={({ isFocusWithin, isDisabled }) =>
                cx(
                    "relative flex w-full items-center gap-2 rounded-lg bg-primary shadow-xs ring-1 ring-primary outline-hidden transition-shadow duration-100 ease-linear ring-inset",
                    isDisabled && "cursor-not-allowed opacity-50",
                    isFocusWithin && "ring-2 ring-brand",

                    // Icon styles
                    "*:data-icon:shrink-0 *:data-icon:text-fg-quaternary",

                    sizes[size].root,
                )
            }
        >
            {isReactComponent(IconProp) ? (
                <IconProp data-icon className="pointer-events-none" aria-hidden="true" />
            ) : isValidElement(IconProp) ? (
                IconProp
            ) : (
                <SearchLg data-icon className="pointer-events-none" aria-hidden="true" />
            )}

            {/*
             * The input paints its own text. It used to be `text-transparent`, with the value
             * redrawn beside it by an absolutely positioned span that split it around the item's
             * supportingText to grey the tail off — an inline-completion effect that could not
             * survive a value wider than the field: an <input> scrolls its content as the caret
             * passes the right edge, an absolute span does not. Typing a long gemeente name left
             * the caret marching off into empty space while the visible text sat frozen and
             * clipped at the start, which is what made searching here feel broken.
             *
             * Nothing was lost with it. The effect only ever showed where an item carried
             * supportingText, and no ComboBox in this app passes one.
             */}
            <div className="flex w-full items-center">
                <AriaInput
                    placeholder={placeholder}
                    // Focusing the field selects what is in it, so the first keystroke replaces
                    // the current choice instead of being spliced into it. Without this, clicking
                    // a combobox that reads "Aa en Hunze" and typing "ams" leaves the caret where
                    // it happened to land and searches for "Aa en Hunzeams" — no gemeente matches
                    // that, so the list empties and the control looks broken. The old value stays
                    // legible until it is typed over, which is why this beats clearing on open.
                    onFocus={(event) => event.currentTarget.select()}
                    className={cx(
                        "w-full appearance-none bg-transparent font-medium text-primary caret-alpha-black/90 placeholder:font-normal placeholder:text-placeholder focus:outline-hidden disabled:cursor-not-allowed",
                        sizes[size].text,
                    )}
                />
            </div>

            {shortcut && (
                <div
                    className={cx(
                        "absolute inset-y-0.5 right-0.5 z-10 hidden items-center rounded-r-[inherit] bg-linear-to-r from-transparent to-bg-primary to-40% pl-8 md:flex",
                        sizes[size].shortcut,
                        shortcutClassName,
                    )}
                >
                    <span
                        className="pointer-events-none rounded px-1 py-px text-xs font-medium text-quaternary ring-1 ring-secondary select-none ring-inset"
                        aria-hidden="true"
                    >
                        ⌘K
                    </span>
                </div>
            )}
        </AriaGroup>
    );
};

export const ComboBox = ({
    placeholder = "Zoeken",
    shortcut = true,
    size = "md",
    children,
    items,
    shortcutClassName,
    icon,
    hideRequiredIndicator,
    ...otherProps
}: ComboBoxProps) => {
    const placeholderRef = useRef<HTMLDivElement>(null);
    const [popoverWidth, setPopoverWidth] = useState("");

    // Resize observer for popover width
    const onResize = useCallback(() => {
        if (!placeholderRef.current) return;

        const divRect = placeholderRef.current?.getBoundingClientRect();

        setPopoverWidth(divRect.width + "px");
    }, [placeholderRef, setPopoverWidth]);

    useResizeObserver({
        ref: placeholderRef,
        box: "border-box",
        onResize,
    });

    return (
        <SelectContext.Provider value={{ size }}>
            <AriaComboBox menuTrigger="focus" {...otherProps}>
                {(state) => (
                    <div className="flex flex-col gap-1.5">
                        {otherProps.label && (
                            <Label isRequired={hideRequiredIndicator ? false : state.isRequired} tooltip={otherProps.tooltip}>
                                {otherProps.label}
                            </Label>
                        )}

                        <ComboBoxValue
                            ref={placeholderRef}
                            placeholder={placeholder}
                            shortcut={shortcut}
                            shortcutClassName={shortcutClassName}
                            icon={icon}
                            size={size}
                            // This is a workaround to correctly calculating the trigger width
                            // while using ResizeObserver wasn't 100% reliable.
                            onFocus={onResize}
                            onPointerEnter={onResize}
                        />

                        <Popover
                            size={size}
                            isScrollable={false}
                            triggerRef={placeholderRef}
                            style={{ width: popoverWidth }}
                            className={otherProps.popoverClassName}
                        >
                            {/*
                             * Virtualized because the one combobox in this app picks from every
                             * gemeente there is. Rendering all 342 rows was a listbox item apiece
                             * — each with its own focus and selection state — rebuilt on every
                             * keystroke, since a keystroke changes which of them match. That is
                             * what made typing a gemeente name lag behind the keyboard. Only the
                             * dozen rows the popover can actually show are built now, so the cost
                             * of a keystroke stops growing with the list.
                             */}
                            <AriaVirtualizer layout={AriaListLayout} layoutOptions={{ estimatedRowHeight: listSizes[size].estimatedRowHeight }}>
                                <AriaListBox items={items} className={cx("w-full overflow-y-auto outline-hidden", listSizes[size].maxHeight)}>
                                    {children}
                                </AriaListBox>
                            </AriaVirtualizer>
                        </Popover>

                        {otherProps.hint && (
                            <HintText isInvalid={state.isInvalid} className={cx(size === "sm" && "text-xs")}>
                                {otherProps.hint}
                            </HintText>
                        )}
                    </div>
                )}
            </AriaComboBox>
        </SelectContext.Provider>
    );
};
