import { useCallback, useEffect, useMemo, useState } from "react";
import type { Selection } from "react-aria-components";
import { type GemeenteOption, serializeSelectie, useFilters } from "@/features/filters";

/**
 * The referentiegroep this page is composing, and the filters that build it.
 *
 * Everything here is the page's own working state. Nothing reaches the dashboard until
 * Toepassen: not the filters, which never leave this page at all, and not the selection, which
 * is deliberately kept out of the shared draft. The draft is what the sidebar *shows*, so
 * writing to it as the user clicks would move the sidebar's dropdown under them long before
 * they asked for it. The page keeps its own selection and commits it in one go.
 *
 * The filters do not merely narrow — they *make* the selection. Filtering to a province, a
 * size class or a population range puts exactly the gemeenten that survive into the group,
 * which is the quickest route to what this page is for: "compare me against everything like
 * me". The map then refines that by hand.
 *
 * Every filter therefore replaces the selection rather than adding to it: two provinces means
 * those two, not the second piled onto whatever was there. Filtering back to everything hands
 * over all 342, which serializeSelectie folds into the "alle" sentinel — the state the page
 * opens in, so the default survives its own round trip.
 *
 * One hook rather than state in either component, because the map and the picker must agree
 * exactly on what is in view and what is chosen; if they disagreed the page would be lying to
 * one of them. The route view owns it and hands it to both.
 */

/** Membership test for a react-aria Selection. "all" is the unnarrowed state: everything passes. */
const komtOvereen = (selectie: Selection, waarden: string[]) =>
    selectie === "all" || waarden.some((waarde) => selectie.has(waarde));

export interface ReferentiegroepSamenstelling {
    provincies: Selection;
    onProvinciesChange: (keys: Selection) => void;
    inwonergroepen: Selection;
    onInwonergroepenChange: (keys: Selection) => void;
    inwonersaantal: [number, number];
    onInwonersaantalChange: (value: [number, number]) => void;
    /** The full population range for this year, which is where the slider sits by default. */
    grenzen: [number, number];

    /** The gemeenten that pass all three filters. */
    zichtbareGemeenten: GemeenteOption[];
    zichtbaar: ReadonlySet<string>;

    /** The group being composed — page-local until Toepassen. */
    selectie: Selection;
    onSelectieChange: (keys: Selection) => void;

    /** True once the composed group differs from the one the dashboard is actually using. */
    hasPendingChanges: boolean;
    /** Hands the composed group to the dashboard. The only thing here that leaves the page. */
    toepassen: () => void;
    /** Puts the page back as it opened. Applies nothing — Toepassen still has to be pressed. */
    herstel: () => void;
}

export function useReferentiegroepSamenstelling(): ReferentiegroepSamenstelling {
    const { options, applied, applyReferentiegroepen } = useFilters();

    const [provincies, setProvincies] = useState<Selection>("all");
    const [inwonergroepen, setInwonergroepen] = useState<Selection>("all");
    // null means "the full range", i.e. no narrowing. Keeping that distinct from an explicit
    // range is what lets the slider follow a year change without an effect yanking the thumbs
    // out from under a drag.
    const [bereik, setBereik] = useState<[number, number] | null>(null);

    const [selectie, setSelectie] = useState<Selection>(applied.referentiegroepen);

    // Follow the dashboard whenever it changes underneath — Toepassen from the sidebar, a year
    // change pruning codes away, the back button. `applied` only changes when the URL does, so
    // this cannot fight the edits above.
    useEffect(() => setSelectie(applied.referentiegroepen), [applied.referentiegroepen]);

    // Derived from the year's own gemeenten. The bar used to hardcode [982, 935793]; neither
    // figure is right for any year the dashboard offers — 2024 is really [972, 931298].
    const grenzen = useMemo<[number, number]>(() => {
        const aantallen = options.gemeenten.map((gemeente) => gemeente.inwoners).filter((aantal): aantal is number => aantal != null);
        return aantallen.length > 0 ? [Math.min(...aantallen), Math.max(...aantallen)] : [0, 1];
    }, [options.gemeenten]);

    /**
     * Which gemeenten survive a given set of filter values.
     *
     * Takes the values rather than reading the state, so a change handler can ask what its own
     * new value *would* leave without waiting a render for the state to catch up — which is
     * what lets it set the selection in the same breath as the filter.
     */
    const overlevenden = useCallback(
        (kiesProvincies: Selection, kiesGroepen: Selection, kiesBereik: [number, number] | null) => {
            const [ondergrens, bovengrens] = kiesBereik ?? grenzen;
            return options.gemeenten.filter(
                (gemeente) =>
                    komtOvereen(kiesProvincies, gemeente.provincie ? [gemeente.provincie] : []) &&
                    komtOvereen(kiesGroepen, gemeente.inwonergroepen) &&
                    // A gemeente with no population figure is never filtered out by the slider:
                    // the range says nothing about it, and silently dropping it would be a lie.
                    (gemeente.inwoners == null || (gemeente.inwoners >= ondergrens && gemeente.inwoners <= bovengrens)),
            );
        },
        [options.gemeenten, grenzen],
    );

    const zichtbareGemeenten = useMemo(() => overlevenden(provincies, inwonergroepen, bereik), [overlevenden, provincies, inwonergroepen, bereik]);
    const zichtbaar = useMemo(() => new Set(zichtbareGemeenten.map((gemeente) => gemeente.id)), [zichtbareGemeenten]);

    /** Whatever a filter leaves standing becomes the group. */
    const kies = useCallback((gemeenten: GemeenteOption[]) => setSelectie(new Set(gemeenten.map((gemeente) => gemeente.id))), []);

    const onProvinciesChange = useCallback(
        (keys: Selection) => {
            setProvincies(keys);
            kies(overlevenden(keys, inwonergroepen, bereik));
        },
        [overlevenden, inwonergroepen, bereik, kies],
    );

    const onInwonergroepenChange = useCallback(
        (keys: Selection) => {
            setInwonergroepen(keys);
            kies(overlevenden(provincies, keys, bereik));
        },
        [overlevenden, provincies, bereik, kies],
    );

    const onInwonersaantalChange = useCallback(
        (waarde: [number, number]) => {
            setBereik(waarde);
            kies(overlevenden(provincies, inwonergroepen, waarde));
        },
        [overlevenden, provincies, inwonergroepen, kies],
    );

    const herstel = useCallback(() => {
        setProvincies("all");
        setInwonergroepen("all");
        setBereik(null);
        setSelectie(applied.referentiegroepen);
    }, [applied.referentiegroepen]);

    const toepassen = useCallback(() => applyReferentiegroepen(selectie), [applyReferentiegroepen, selectie]);

    // Compared as the URL would carry them rather than as Sets: "all" and an explicit list of
    // every gemeente are the same group, and only this spelling knows that.
    const hasPendingChanges = serializeSelectie(selectie, options.gemeenten) !== serializeSelectie(applied.referentiegroepen, options.gemeenten);

    return {
        provincies,
        onProvinciesChange,
        inwonergroepen,
        onInwonergroepenChange,
        inwonersaantal: bereik ?? grenzen,
        onInwonersaantalChange,
        grenzen,
        zichtbareGemeenten,
        zichtbaar,
        selectie,
        onSelectieChange: setSelectie,
        hasPendingChanges,
        toepassen,
        herstel,
    };
}
