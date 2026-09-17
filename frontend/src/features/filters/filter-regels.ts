import type { Selection } from "react-aria-components";
import type { FilterOption } from "./api";
import { useFilters } from "./context/filters-context";
import { useFilterRelevance } from "./relevance";

/**
 * How a multi-select reads as one phrase.
 *
 * A Selection is either the literal "all" or a Set of codes, and a Set holding every option means
 * the same thing as "all" — the sidebar's "Alles" row produces one or the other depending on how
 * it was reached, and they must not read differently here.
 *
 * Named rather than counted while the list is short: "<25k, G4" says what the charts are drawn
 * from where "2 inwonergroepen" only says how much. Gemeenten run to 342, so those are counted.
 */
const beschrijfSelectie = (selectie: Selection, opties: FilterOption[], alles: string, meervoud: string, maxNamen = 0): string => {
    if (selectie === "all") return alles;

    const gekozen = new Set([...selectie].map(String));
    if (opties.length > 0 && gekozen.size === opties.length) return alles;
    if (gekozen.size === 0) return `Geen`;

    if (gekozen.size <= maxNamen) {
        const namen = opties.filter((optie) => gekozen.has(optie.id)).map((optie) => optie.label);
        if (namen.length > 0) return namen.join(", ");
    }

    return `${gekozen.size} ${meervoud}`;
};

export interface FilterRegel {
    label: string;
    waarde: string;
}

export interface FilterRegels {
    regels: FilterRegel[];
    /** False where the route draws from no filter at all — see FilterRelevance.any. */
    relevant: boolean;
    /** The options carry the labels, so until they land there is nothing to name the codes with. */
    isLoading: boolean;
}

/**
 * What the charts are currently filtered to, as label/value pairs.
 *
 * Read by the Excel export behind each chart's download button, which prints these rows above the
 * figures, and by FilterSummary, which renders the same pairs as a panel. The sheet and the screen
 * must agree: a download describing different filters than the sidebar shows would be describing a
 * chart the reader never saw.
 *
 * Reads the URL-backed filters so the summary always agrees with the charts and sidebar.
 */
export function useFilterRegels(): FilterRegels {
    const { applied, options, isLoading } = useFilters();
    const relevance = useFilterRelevance();

    if (!relevance.any || isLoading) {
        return { regels: [], relevant: relevance.any, isLoading };
    }

    const regels: FilterRegel[] = [];

    if (relevance.gemeente) {
        const naam = options.gemeenten.find((gemeente) => gemeente.id === applied.gemeente)?.label;
        if (naam) regels.push({ label: "Gemeente", waarde: naam });
    }

    if (relevance.referentie) {
        regels.push({
            // "Referentiegroep" on most pages, "Gemeente" on Trends, where the same
            // selection is the set every average is taken over rather than a group to compare
            // against. The gemeente row above is absent there, so the two never collide.
            label: relevance.referentieLabel,
            waarde: beschrijfSelectie(applied.referentiegroepen, options.gemeenten, "Alle", "gemeenten"),
        });
    }

    if (relevance.inwoner) {
        regels.push({
            label: "Inwonergroep",
            waarde: beschrijfSelectie(applied.inwonergroepen, options.inwonergroepen, "Alle", "groepen", 3),
        });
    }

    // One row, not two: a verslagsoort code carries its own year ("2024X000"), so its label and a
    // jaar row beside it would print the year twice.
    const verslagsoort = relevance.verslagsoort ? options.verslagsoorten.find((soort) => soort.id === applied.verslagsoort)?.label : undefined;
    if (applied.jaar) {
        regels.push(verslagsoort ? { label: "Verslagsoort", waarde: `${verslagsoort} ${applied.jaar}` } : { label: "Jaar", waarde: String(applied.jaar) });
    }

    if (relevance.reservemutaties) {
        regels.push({ label: "Reservemutaties", waarde: applied.reservemutaties ? "Aan" : "Uit" });
    }

    return { regels, relevant: true, isLoading: false };
}
