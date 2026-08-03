import { serializeApplied, useFilters } from "@/features/filters";
import { useChartQuery } from "@/hooks/use-chart-query";
import { type LastenTaakveld, fetchLasten } from "../api";

/**
 * One Lasten page's data, refetched whenever the *applied* filters change — the pending
 * selections in the sidebar do not reach this until the user presses "Toepassen".
 *
 * The applied filters live in the URL (see FiltersProvider), so a filtered view of this page
 * can be shared and survives a reload. They are also the cache key, so the ten taakveld tabs
 * cache separately and returning to one already opened costs no request — see useChartQuery.
 */
export function useLasten(taakveld: LastenTaakveld) {
    const { applied, isReady } = useFilters();

    return useChartQuery({
        feature: "lasten",
        params: {
            taakveld,
            jaar: applied.jaar,
            verslagsoort: applied.verslagsoort,
            gemeente: applied.gemeente,
            // `referentiegroepen` is a react-aria Selection: either a Set or the literal "all",
            // the latter meaning every gemeente in the year — which the request carries as the
            // `alle` sentinel rather than naming the ~342 codes, so this no longer waits on
            // options.gemeenten and the fetch no longer refires once they arrive. See
            // ChartView._referentie.
            referentie: serializeApplied(applied.referentiegroepen),
            // These charts read the reservemutaties toggle: it moves the lasten, and the mutaties
            // it switches on are a taakveld of Bestuur en ondersteuning like any other.
            reserve: applied.reservemutaties,
        },
        enabled: isReady,
        fetcher: fetchLasten,
    });
}
