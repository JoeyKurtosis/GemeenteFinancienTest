import { cx } from "@/utils/cx";

interface DonutSkeletonProps {
    /** Height of the ring placeholders, matching the `DonutChart` height the card asks for. */
    height?: number;
    /** Additional CSS classes to apply to the wrapper. */
    className?: string;
}

/** The ring's share of the box and the width of its band — DonutChart's RING_FILL and BAND. */
const RING_FILL = 0.62;
const BAND = 0.69;

/**
 * Placeholder for the donut pair while its figures load — the pulsing block ChartSkeleton draws,
 * in the shape this card actually takes: a legend beside or above two rings.
 *
 * Laid out on the same breakpoints and gaps as `Donuts`, so the card is already the height it will
 * be once the data lands. A skeleton of a different size moves every chart below it down the page
 * at the moment the reader starts reading.
 */
export function DonutSkeleton({ height = 320, className }: DonutSkeletonProps) {
    // Six rows: about what a taakveld legend carries, and enough to read as a list.
    const rows = [0, 1, 2, 3, 4, 5];
    // Cap the placeholder to the available width on very narrow cards.
    const size = height * RING_FILL;
    const hole = `${((1 - BAND) / 2) * 100}%`;

    return (
        <div className={cx("@container/donuts min-w-0 animate-pulse", className)} aria-hidden="true">
            <div className="flex min-w-0 flex-col gap-6 @[1280px]/donuts:flex-row @[1280px]/donuts:items-center">
                <ul className="flex min-w-0 flex-row flex-wrap gap-x-4 gap-y-1.5 @[1280px]/donuts:max-w-56 @[1280px]/donuts:shrink-0 @[1280px]/donuts:flex-col">
                    {rows.map((row) => (
                        <li key={row} className="flex items-center gap-2">
                            <span className="block size-2 shrink-0 rounded-full bg-secondary" />
                            {/* Uneven widths — a column of identical bars reads as a table, not a legend. */}
                            <span className="block h-3 rounded-sm bg-secondary" style={{ width: 84 + ((row * 37) % 56) }} />
                        </li>
                    ))}
                </ul>

                <div className="grid min-w-0 flex-1 grid-cols-1 gap-6 @[960px]/donuts:grid-cols-2">
                    {[0, 1].map((ring) => (
                        <div key={ring} className="flex min-w-0 items-center justify-center" style={{ height }}>
                            {/* The hole is punched with the card's own background rather than left as a
                            disc: a filled circle is a pie chart, and this card draws neither. */}
                            <div className="relative aspect-square max-w-full rounded-full bg-secondary" style={{ width: size }}>
                                <div className="absolute rounded-full bg-primary" style={{ inset: hole }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
