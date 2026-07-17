import type { Key, Selection } from "react-aria-components";
import { Button } from "@/components/base/buttons/button";
import { MultiSelect } from "@/components/base/select/multi-select";
import { RangeSlider } from "@/components/base/slider/range-slider";
import { type FilterOption, type GemeenteOption, useFilters } from "@/features/filters";
import type { ReferentiegroepSamenstelling } from "../hooks/use-referentiegroep-samenstelling";

/** Synthetic key for the "Alles" row; never leaves this component. */
const ALLES = "__alle__";

/**
 * Wires an "Alles" row into a MultiSelect, mirroring the sidebar filters: it is checked
 * exactly when every real option is, so unchecking one unchecks "Alles" with it, and
 * toggling "Alles" selects or clears the lot. The trigger reads "Alles" at both extremes —
 * nothing selected (no narrowing) and everything selected.
 */
const withAllesRow = (options: FilterOption[], selected: Selection, onChange: (keys: Selection) => void) => {
    const ids = options.map((option) => option.id);
    const gekozen = selected === "all" ? new Set(ids) : new Set([...selected].map(String));
    const alleGekozen = ids.length > 0 && ids.every((id) => gekozen.has(id));

    return {
        items: [{ id: ALLES, label: "Alles" }, ...options],
        selectedKeys: new Set<Key>(alleGekozen ? [ALLES, ...ids] : gekozen) as Selection,
        placeholder: "Alles",
        selectedCountFormatter: () => (alleGekozen ? "Alles" : `${gekozen.size} geselecteerd`),
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

/**
 * The Referentiegroep picker, once the page filters have narrowed what it lists.
 *
 * It cannot use withAllesRow: that hands its whole item list back on every edit, and the item
 * list here is a *subset*. Ticking "Alles" would replace the entire referentiegroep with the
 * gemeenten currently in view, and unticking it would clear all 342 rather than those few.
 *
 * So "Alles" here means "all the gemeenten I can currently see", and a selection that is out
 * of view is carried through untouched rather than destroyed by a row that cannot see it.
 * Changing a *filter* does deliberately re-make the selection — but editing this list must
 * only touch what the list actually shows.
 *
 * Out-of-view selections are rare now that every filter re-makes the selection, but they do
 * happen: switch year with the slider set, and the surviving set moves under a selection that
 * no handler fired for. Whenever there are any, the trigger says so — a selection the user
 * cannot see must never be a silent one.
 */
const withZichtbareAllesRow = (
    zichtbareGemeenten: GemeenteOption[],
    alleGemeenten: GemeenteOption[],
    selected: Selection,
    onChange: (keys: Selection) => void,
) => {
    const zichtbareIds = zichtbareGemeenten.map((gemeente) => gemeente.id);
    const isZichtbaar = new Set(zichtbareIds);
    const gekozen = selected === "all" ? new Set(alleGemeenten.map((gemeente) => gemeente.id)) : new Set([...selected].map(String));

    const buitenBeeld = [...gekozen].filter((id) => !isZichtbaar.has(id));
    const zichtbareGekozen = zichtbareIds.filter((id) => gekozen.has(id));
    const alleZichtbareGekozen = zichtbareIds.length > 0 && zichtbareGekozen.length === zichtbareIds.length;

    /** Whatever happens in view, the out-of-view picks come along unchanged. */
    const commit = (picks: Iterable<string>) => onChange(new Set([...buitenBeeld, ...picks]));

    return {
        items: [{ id: ALLES, label: "Alles" }, ...zichtbareGemeenten],
        selectedKeys: new Set<Key>(alleZichtbareGekozen ? [ALLES, ...zichtbareGekozen] : zichtbareGekozen) as Selection,
        placeholder: "Alles",
        selectedCountFormatter: () => {
            if (alleGemeenten.length > 0 && gekozen.size === alleGemeenten.length) return "Alles";
            const buiten = buitenBeeld.length > 0 ? ` (${buitenBeeld.length} buiten filter)` : "";
            return `${gekozen.size} geselecteerd${buiten}`;
        },
        onSelectionChange: (keys: Selection) => {
            if (keys === "all") {
                commit(zichtbareIds);
                return;
            }

            const next = new Set([...keys].map(String));
            if (next.has(ALLES) !== alleZichtbareGekozen) {
                commit(next.has(ALLES) ? zichtbareIds : []);
                return;
            }

            next.delete(ALLES);
            commit(next);
        },
    };
};

interface ReferentiegroepFilterBarProps {
    samenstelling: ReferentiegroepSamenstelling;
}

export function ReferentiegroepFilterBar({ samenstelling }: ReferentiegroepFilterBarProps) {
    const { options, isLoading } = useFilters();
    const {
        provincies,
        onProvinciesChange,
        inwonergroepen,
        onInwonergroepenChange,
        inwonersaantal,
        onInwonersaantalChange,
        grenzen,
        zichtbareGemeenten,
        selectie,
        onSelectieChange,
        hasPendingChanges,
        toepassen,
        herstel,
    } = samenstelling;

    // Each of the three filters both narrows what is on offer and re-makes the group out of
    // what survives — see use-referentiegroep-samenstelling. All of it is page-local: the
    // sidebar does not hear about any of it until Toepassen.
    const inwonergroep = withAllesRow(options.inwonergroepen, inwonergroepen, onInwonergroepenChange);
    const provincie = withAllesRow(options.provincies, provincies, onProvinciesChange);
    const referentie = withZichtbareAllesRow(zichtbareGemeenten, options.gemeenten, selectie, onSelectieChange);

    return (
        <div className="flex flex-wrap items-end gap-6 rounded-[12px] bg-secondary p-5">
            <div className="w-full max-w-56">
                {/* Select only, no search — the five size classes fit on screen. */}
                <MultiSelect label="Inwonersaantalgroep" size="sm" isDisabled={isLoading} showSearch={false} showFooter={false} {...inwonergroep}>
                    {(item) => (
                        <MultiSelect.Item id={item.id} label={item.label} selectionIndicator="checkbox">
                            {item.label}
                        </MultiSelect.Item>
                    )}
                </MultiSelect>
            </div>

            <div className="w-full max-w-40">
                {/* Bounds come from the year's own gemeenten rather than fixed numbers: the list
                    changes per year, and the figures that used to sit here matched no year. */}
                <RangeSlider
                    label="Inwonersaantal"
                    minValue={grenzen[0]}
                    maxValue={grenzen[1]}
                    value={inwonersaantal}
                    onChange={onInwonersaantalChange}
                />
            </div>

            <div className="w-full max-w-56">
                <MultiSelect label="Referentiegroep" size="sm" isDisabled={isLoading} showFooter={false} {...referentie}>
                    {(item) => (
                        <MultiSelect.Item id={item.id} label={item.label} selectionIndicator="checkbox">
                            {item.label}
                        </MultiSelect.Item>
                    )}
                </MultiSelect>
            </div>

            <div className="w-full max-w-56">
                <MultiSelect label="Provincie" size="sm" isDisabled={isLoading} showFooter={false} {...provincie}>
                    {(item) => (
                        <MultiSelect.Item id={item.id} label={item.label} selectionIndicator="checkbox">
                            {item.label}
                        </MultiSelect.Item>
                    )}
                </MultiSelect>
            </div>

            {/* The page composes a group and hands it over here, and only here. Reset undoes the
                composing; it does not apply anything, and it leaves the rest of the dashboard's
                filters — gemeente, jaar, verslagsoort — where the user put them. */}
            <div className="ml-auto flex gap-3">
                <Button color="secondary" size="sm" onClick={herstel}>
                    Reset
                </Button>
                <Button size="sm" isDisabled={!hasPendingChanges} onClick={toepassen}>
                    Toepassen
                </Button>
            </div>
        </div>
    );
}
