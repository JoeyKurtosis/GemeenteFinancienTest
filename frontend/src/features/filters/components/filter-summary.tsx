import { cx } from "@/utils/cx";
import { useFilterRegels } from "../filter-regels";

/**
 * The same block NavAccountCard is built as, at the other end of the sidebar — rounded-xl, p-3 —
 * so the two read as one family. Filled rather than ringed: the fill is what says these are
 * settings that are switched on, where the account card is simply a card.
 */
const PANEEL = "flex flex-col gap-1.5 rounded-xl bg-secondary p-3";

/**
 * What the charts are currently filtered to, as a compact panel.
 *
 * Currently mounted nowhere: it was written for the sidebar, back when the controls sat behind a
 * popover and nothing on screen said what the figures described once that popover closed. The
 * expanded sidebar now shows the controls themselves, which carry the same values. Kept for the
 * places that still only have room for the reading — a summary row above the charts, say.
 *
 * Each value is named rather than left to stand alone. "'s-Hertogenbosch" and "2 gemeenten" say
 * nothing about which filter they belong to when they sit side by side, and those two in
 * particular are easy to read the wrong way round.
 *
 * The rows themselves come from useFilterRegels, which the chart download button shares — see the
 * note there on why the two must agree.
 */
export function FilterSummary({ className }: { className?: string }) {
    const { regels, relevant, isLoading } = useFilterRegels();

    // Routes that draw from no filter — the dashboard index, and Referentiegroep with its own
    // filter bar — have nothing to describe.
    if (!relevant) return null;

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
