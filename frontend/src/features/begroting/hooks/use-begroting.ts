import { serializeApplied, useFilters } from "@/features/filters";
import { useChartQuery } from "@/hooks/use-chart-query";
import { type BegrotingWeergave, fetchBegroting } from "../api";

/**
 * The page's data, refetched whenever the *applied* filters change — the pending
 * selections in the sidebar do not reach this until the user presses "Toepassen".
 *
 * The applied filters live in the URL (see FiltersProvider), so a filtered view of this page
 * can be shared and survives a reload. They are also the cache key, so the three weergave tabs
 * cache separately and returning to one already opened costs no request — see useChartQuery.
 */
export function useBegroting(weergave: BegrotingWeergave) {
    const { applied, isReady } = useFilters();

    return useChartQuery({
        feature: "begroting",
        params: {
            weergave,
            jaar: applied.jaar,
            verslagsoort: applied.verslagsoort,
            gemeente: applied.gemeente,
            // `referentiegroepen` is a react-aria Selection: either a Set or the literal "all",
            // the latter meaning every gemeente in the year — which the request carries as the
            // `alle` sentinel rather than naming the ~342 codes, so this no longer waits on
            // options.gemeenten and the fetch no longer refires once they arrive. See
            // ChartView._referentie.
            referentie: serializeApplied(applied.referentiegroepen),
            reserve: applied.reservemutaties,
        },
        enabled: isReady,
        fetcher: fetchBegroting,
    });
}
