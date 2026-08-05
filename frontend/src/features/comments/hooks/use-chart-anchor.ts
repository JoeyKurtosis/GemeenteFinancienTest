import { useEffect, useRef, useState } from "react";
import { chartAnchorId } from "../chart-registry";

/**
 * Makes a chart card linkable: gives it the element id the notities-overzicht points at, scrolls
 * it into view when the page is opened on that hash, and says when the card should open itself.
 *
 * The router scrolls to a hash itself, but a card is on the page before its figures are — the
 * charts above it grow as their data arrives, and the target drifts down from under the scroll.
 * So it is scrolled again once this card's own data has landed.
 *
 * `shouldExpand` only ever goes from false to true, so a card opens once on arrival and stays
 * closed after you close it.
 */
export function useChartAnchor(chartId: string | undefined, isLoading: boolean) {
    const ref = useRef<HTMLDivElement>(null);
    const anchorId = chartId ? chartAnchorId(chartId) : undefined;
    const [shouldExpand, setShouldExpand] = useState(false);

    useEffect(() => {
        if (!anchorId || isLoading) return;
        if (window.location.hash !== `#${anchorId}`) return;

        setShouldExpand(true);

        const timer = window.setTimeout(() => ref.current?.scrollIntoView({ block: "center", behavior: "smooth" }), 100);
        return () => window.clearTimeout(timer);
    }, [anchorId, isLoading]);

    return { ref, anchorId, shouldExpand };
}
