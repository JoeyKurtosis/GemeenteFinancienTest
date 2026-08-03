"use client";

import { HelpCircle } from "@untitledui/icons";
import type { Key, Selection } from "react-aria-components";
import { Button } from "@/components/base/buttons/button";
import { MultiSelect } from "@/components/base/select/multi-select";
import { Select } from "@/components/base/select/select";
import { Toggle } from "@/components/base/toggle/toggle";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { type FilterOption, useFilterRelevance, useFilters } from "@/features/filters";
import { cx } from "@/utils/cx";

/** Synthetic key for the "Alles" row; never leaves this component. */
const ALLES = "__alle__";

/**
 * Wires an "Alles" row into a MultiSelect. It is checked exactly when every real option is,
 * so unchecking one option unchecks "Alles" along with it, and toggling "Alles" itself
 * selects or clears the lot.
 */
const withAllesRow = (options: FilterOption[], selected: Selection, onChange: (keys: Selection) => void) => {
    const ids = options.map((option) => option.id);
    const gekozen = selected === "all" ? new Set(ids) : new Set([...selected].map(String));
    const alleGekozen = ids.length > 0 && ids.every((id) => gekozen.has(id));

    return {
        items: [{ id: ALLES, label: "Alles" }, ...options],
        selectedKeys: new Set<Key>(alleGekozen ? [ALLES, ...ids] : gekozen) as Selection,
        // Counts real options, not rows — the "Alles" row would otherwise count as one.
        selectedCountFormatter: () => `${gekozen.size} geselecteerd`,
        onSelectionChange: (keys: Selection) => {
            if (keys === "all") {
                onChange(new Set(ids));
                return;
            }

            const next = new Set([...keys].map(String));
            if (next.has(ALLES) !== alleGekozen) {
                onChange(next.has(ALLES) ? new Set(ids) : new Set());
                return;
            }

            next.delete(ALLES);
            onChange(next);
        },
    };
};

interface SidebarFiltersProps {
    /** Additional CSS classes to apply to the wrapper. */
    className?: string;
    /** Called when the user applies the filters (e.g. to close the popover). */
    onApply?: () => void;
}

/**
 * The dashboard filters, of which each route shows the ones it actually draws with.
 *
 * Rendered from every control that opens the filter menu — the sidebar's button, its collapsed
 * icon, and the summary row above the charts. It reads FiltersProvider itself rather than taking
 * the selections as props: it is only ever mounted inside that provider, and passing twelve
 * values down meant each new trigger had to assemble the same object again.
 *
 * Gemeentelijke Stand is the one route that reads differently: it has no single gemeente
 * to compare against a group, so the ComboBox is left off and the multi-select is the
 * report's "Gemeente" slicer — the set of municipalities every average is taken over.
 */
export const SidebarFilters = ({ className, onApply }: SidebarFiltersProps) => {
    const {
        options,
        draftVerslagsoorten,
        isLoading,
        reset,
        apply,
        hasPendingChanges,
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

    const relevance = useFilterRelevance();
    const isGemeentelijkeStand = !relevance.gemeente;
    const showReservemutaties = relevance.reservemutaties;

    // Only where there is a choice to make. A year carries a Jaarrekening once it has been
    // filed, so the newest year or two hold nothing but a Begroting — and a dropdown with one
    // option is a control that cannot do anything. Counted off the options rather than tested
    // for the "005" suffix, so this stays a statement about having something to pick.
    //
    // Off the *draft* year, not the applied one: picking 2024 in the select beside this has to
    // reveal the choice immediately, not after a Toepassen and a second trip into this menu.
    //
    // Kept here rather than in useFilterRelevance because it is a statement about the data, not
    // about the route — the summary row asks the same hook and wants the route's answer.
    const showVerslagsoort = draftVerslagsoorten.length > 1 && relevance.verslagsoort;

    const jaren = options.jaren.map((jaar) => ({ id: String(jaar), label: String(jaar) }));

    const referentiegroep = withAllesRow(options.gemeenten, selectedReferentiegroepen, onReferentiegroepenChange);
    const inwonergroep = withAllesRow(options.inwonergroepen, selectedInwonergroepen, onInwonergroepenChange);

    return (
        <div className={cx("flex flex-col gap-4", className)}>
            {!isGemeentelijkeStand && (
                <Select.ComboBox
                    label="Jouw gemeente"
                    placeholder={isLoading ? "Laden..." : "Zoek gemeente..."}
                    size="sm"
                    shortcut={false}
                    isDisabled={isLoading}
                    items={options.gemeenten}
                    selectedKey={selectedGemeente}
                    onSelectionChange={onGemeenteChange}
                >
                    {(item) => (
                        <Select.Item id={item.id} label={item.label}>
                            {item.label}
                        </Select.Item>
                    )}
                </Select.ComboBox>
            )}

            {/* One selection, two readings: the group your gemeente is held against
                elsewhere, the population the averages are taken over here. */}
            <MultiSelect
                label={relevance.referentieLabel}
                placeholder="Selecteer gemeenten"
                size="sm"
                isDisabled={isLoading}
                showFooter={false}
                {...referentiegroep}
            >
                {(item) => (
                    <MultiSelect.Item id={item.id} label={item.label} selectionIndicator="checkbox">
                        {item.label}
                    </MultiSelect.Item>
                )}
            </MultiSelect>

            {/* Each selected size class becomes a line of its own on the charts. */}
            {isGemeentelijkeStand && (
                <MultiSelect
                    label="Inwonergroep"
                    placeholder="Selecteer inwonergroepen"
                    size="sm"
                    isDisabled={isLoading}
                    showFooter={false}
                    {...inwonergroep}
                >
                    {(item) => (
                        <MultiSelect.Item id={item.id} label={item.label} selectionIndicator="checkbox">
                            {item.label}
                        </MultiSelect.Item>
                    )}
                </MultiSelect>
            )}

            {showVerslagsoort && (
                <Select
                    label="Verslagsoort"
                    placeholder="Selecteer verslagsoort"
                    size="sm"
                    isDisabled={isLoading}
                    items={draftVerslagsoorten}
                    selectedKey={selectedVerslagsoort}
                    onSelectionChange={onVerslagsoortChange}
                >
                    {(item) => (
                        <Select.Item id={item.id} label={item.label}>
                            {item.label}
                        </Select.Item>
                    )}
                </Select>
            )}

            <Select
                label="Jaar"
                placeholder="Selecteer jaar"
                size="sm"
                isDisabled={isLoading}
                items={jaren}
                selectedKey={selectedJaar}
                onSelectionChange={onJaarChange}
            >
                {(item) => (
                    <Select.Item id={item.id} label={item.label}>
                        {item.label}
                    </Select.Item>
                )}
            </Select>
            {showReservemutaties && (
                <div className="flex items-start gap-1.5">
                    <Toggle label="Reservemutaties" isSelected={reservemutaties} onChange={onReservemutatiesChange} />
                    <Tooltip
                        title="Door middel van deze knop kunt u de reservemutaties van een gemeente wegfilteren of juist meenemen in de bedragen. Dit is met name interessant wanneer een groot deel van de inkomsten of uitgaven een reservemutatie betreft"
                        placement="top"
                    >
                        <TooltipTrigger className="flex h-5 cursor-pointer items-center text-fg-quaternary transition duration-100 ease-linear hover:text-fg-quaternary_hover focus:text-fg-quaternary_hover">
                            <HelpCircle className="size-4 stroke-[2.25px]" />
                        </TooltipTrigger>
                    </Tooltip>
                </div>
            )}

            <div className="mt-1 flex gap-3">
                <Button color="secondary" size="sm" className="flex-1" onClick={reset}>
                    Reset
                </Button>
                <Button
                    color="primary"
                    size="sm"
                    className="flex-1"
                    isDisabled={!hasPendingChanges}
                    onClick={() => {
                        apply();
                        onApply?.();
                    }}
                >
                    Toepassen
                </Button>
            </div>
        </div>
    );
};
