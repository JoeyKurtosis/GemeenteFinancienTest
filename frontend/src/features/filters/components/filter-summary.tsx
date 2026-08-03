import type { Selection } from "react-aria-components";
import { cx } from "@/utils/cx";
import type { FilterOption } from "../api";
import { useFilters } from "../context/filters-context";
import { useFilterRelevance } from "../relevance";

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

interface Regel {
    label: string;
    waarde: string;
}

/**
 * The same block NavAccountCard is built as, at the other end of the sidebar — rounded-xl, p-3 —
 * so the two read as one family. Filled rather than ringed: the fill is what says these are
 * settings that are switched on, where the account card is simply a card.
 */
const PANEEL = "flex flex-col gap-1.5 rounded-xl bg-secondary p-3";

/**
 * What the charts are currently filtered to, under the sidebar's Filters button.
 *
 * That button is otherwise the only thing on screen that says these filters exist: the controls
 * are behind a popover, and once it closes nothing said what the figures actually described. The
 * report this dashboard replaces kept every slicer visible in its header for that reason — every
 * number on a page moves with these.
 *
 * Each value is named rather than left to stand alone. "'s-Hertogenbosch" and "2 gemeenten" say
 * nothing about which filter they belong to when they sit side by side, and those two in
 * particular are easy to read the wrong way round.
 *
 * Reads the *applied* filters, never the draft: this has to agree with the charts, and the draft
 * is what the sidebar is still being told, not what was asked of the backend.
 */
export function FilterSummary({ className }: { className?: string }) {
    const { applied, options, isLoading } = useFilters();
    const relevance = useFilterRelevance();

    // Routes that draw from no filter — the dashboard index, and Referentiegroep with its own
    // filter bar — have nothing to describe.
    if (!relevance.any) return null;

    // The options carry the labels, so until they land there is nothing to name the codes with.
    if (isLoading) {
        return (
            <div className={cx(PANEEL, className)} aria-hidden="true">
                {[0, 1, 2].map((rij) => (
                    <div key={rij} className="flex items-center justify-between gap-2">
                        <div className="h-3 w-16 animate-pulse rounded-sm bg-quaternary" />
                        <div className="h-3 w-20 animate-pulse rounded-sm bg-quaternary" />
                    </div>
                ))}
            </div>
        );
    }

    const regels: Regel[] = [];

    if (relevance.gemeente) {
        const naam = options.gemeenten.find((gemeente) => gemeente.id === applied.gemeente)?.label;
        if (naam) regels.push({ label: "Gemeente", waarde: naam });
    }

    if (relevance.referentie) {
        regels.push({
            // "Referentiegroep" on most pages, "Gemeente" on Gemeentelijke Stand, where the same
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
        regels.push(
            verslagsoort ? { label: "Verslagsoort", waarde: `${verslagsoort} ${applied.jaar}` } : { label: "Jaar", waarde: String(applied.jaar) },
        );
    }

    if (relevance.reservemutaties) {
        regels.push({ label: "Reservemutaties", waarde: applied.reservemutaties ? "Aan" : "Uit" });
    }

    if (regels.length === 0) return null;

    return (
        <dl className={cx(PANEEL, className)}>
            {regels.map((regel) => (
                <div key={regel.label} className="flex items-baseline justify-between gap-2">
                    <dt className="shrink-0 text-xs text-tertiary">{regel.label}</dt>
                    {/* min-w-0 is what lets truncate bite inside a flex row. The full value stays
                        reachable on hover, so a long gemeente name is shortened, never lost. */}
                    <dd className="min-w-0 truncate text-xs font-semibold text-secondary" title={regel.waarde}>
                        {regel.waarde}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
