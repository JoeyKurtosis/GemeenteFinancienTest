"use client";

import { HelpCircle, LinkExternal01 } from "@untitledui/icons";
import { Link, useLocation } from "@tanstack/react-router";
import { type Key, type Selection } from "react-aria-components";
import { Label } from "@/components/base/input/label";
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
}

/**
 * The dashboard filters. Verslagsoort stays visible on every route to keep the selection clear.
 *
 * Rendered twice by the sidebar: inline when it is expanded, and inside the collapsed rail's
 * funnel popover. It reads FiltersProvider itself rather than taking the selections as props:
 * it is only ever mounted inside that provider, and passing the values down meant each new
 * trigger had to assemble the same object again.
 *
 * Trends is the one route that reads differently: it has no single gemeente
 * to compare against a group, so the ComboBox is left off and the multi-select is the
 * report's "Gemeente" slicer — the set of municipalities every average is taken over.
 */
export const SidebarFilters = ({ className }: SidebarFiltersProps) => {
    const { pathname } = useLocation();
    const {
        options,
        availableVerslagsoorten,
        isLoading,
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
    const isTrends = !relevance.gemeente;
    const showReservemutaties = relevance.reservemutaties;

    const vasteVerslagsoort = availableVerslagsoorten.length === 1 ? availableVerslagsoorten[0] : undefined;

    const jaren = options.jaren.map((jaar) => ({ id: String(jaar), label: String(jaar) }));

    const referentiegroep = withAllesRow(options.gemeenten, selectedReferentiegroepen, onReferentiegroepenChange);
    const inwonergroep = withAllesRow(options.inwonergroepen, selectedInwonergroepen, onInwonergroepenChange);

    return (
        <div className={cx("flex flex-col gap-4", className)}>
            {!isTrends && (
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
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                    <Link
                        to="/referentiegroep"
                        search={(previous) => ({ ...previous, terug: pathname })}
                        className="flex items-center gap-1.5 text-fg-quaternary transition duration-100 ease-linear hover:text-fg-quaternary_hover"
                    >
                        <Label className="cursor-pointer">{relevance.referentieLabel}</Label>
                        <LinkExternal01 className="size-4" aria-hidden="true" />
                    </Link>
                </div>
                <MultiSelect placeholder="Selecteer gemeenten" size="sm" isDisabled={isLoading} showFooter={false} {...referentiegroep}>
                    {(item) => (
                        <MultiSelect.Item id={item.id} label={item.label} selectionIndicator="checkbox">
                            {item.label}
                        </MultiSelect.Item>
                    )}
                </MultiSelect>
            </div>

            {/* Each selected size class becomes a line of its own on the charts. */}
            {isTrends && (
                <MultiSelect label="Inwonergroep" placeholder="Selecteer inwonergroepen" size="sm" isDisabled={isLoading} showFooter={false} {...inwonergroep}>
                    {(item) => (
                        <MultiSelect.Item id={item.id} label={item.label} selectionIndicator="checkbox">
                            {item.label}
                        </MultiSelect.Item>
                    )}
                </MultiSelect>
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
            {!isLoading && availableVerslagsoorten.length > 1 ? (
                <Select
                    label="Verslagsoort"
                    placeholder="Selecteer verslagsoort"
                    size="sm"
                    items={availableVerslagsoorten}
                    selectedKey={selectedVerslagsoort}
                    onSelectionChange={onVerslagsoortChange}
                >
                    {(item) => (
                        <Select.Item id={item.id} label={item.label}>
                            {item.label}
                        </Select.Item>
                    )}
                </Select>
            ) : (
                <dl className="flex flex-col gap-1.5">
                    <dt className="text-sm font-medium text-secondary">Verslagsoort</dt>
                    <dd className="flex flex-col gap-1.5">
                        <p className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary shadow-xs ring-1 ring-primary ring-inset">
                            {isLoading ? "Laden..." : (vasteVerslagsoort?.label ?? "Geen verslagsoort beschikbaar")}
                        </p>
                    </dd>
                </dl>
            )}
            {showReservemutaties && (
                <div className="flex items-start gap-1.5">
                    <Toggle label="Reservemutaties" isSelected={reservemutaties} onChange={onReservemutatiesChange} />
                    <Tooltip
                        title="Door middel van deze knop kunt u de reservemutaties van een gemeente wegfilteren of juist meenemen in de bedragen. Dit is met name interessant wanneer een groot deel van de inkomsten of uitgaven een reservemutatie betreft"
                        placement="top"
                    >
                        <TooltipTrigger aria-label="Uitleg over reservemutaties" className="flex size-6 cursor-pointer items-center justify-center rounded-sm text-fg-tertiary outline-focus-ring transition duration-100 ease-linear hover:text-secondary focus-visible:outline-2 focus-visible:outline-offset-2">
                            <HelpCircle aria-hidden="true" className="size-4 stroke-[2.25px]" />
                        </TooltipTrigger>
                    </Tooltip>
                </div>
            )}
        </div>
    );
};
