import { serializeApplied, useFilters } from "@/features/filters";
import { useChartQuery } from "@/hooks/use-chart-query";
import { fetchBenchmark } from "../api";

/**
 * The page's data, refetched whenever the *applied* filters change — the pending
 * selections in the sidebar reach this through the URL as soon as the user chooses them.
 *
 * The applied filters live in the URL (see FiltersProvider), so a filtered view of this
 * page can be shared and survives a reload. They are also the cache key, so navigating away
 * and back costs no request — see useChartQuery.
 */
export function useBenchmark() {
    const { applied, isReady } = useFilters();

    return useChartQuery({
        feature: "benchmark",
        params: {
            jaar: applied.jaar,
            verslagsoort: applied.verslagsoort,
            gemeente: applied.gemeente,
            // `referentiegroepen` is a react-aria Selection: either a Set or the literal "all",
            // the latter meaning every gemeente in the year — which the request carries as the
            // `alle` sentinel rather than naming the ~342 codes, so this no longer waits on
            // options.gemeenten and the fetch no longer refires once they arrive. See
            // ChartView._referentie.
            referentie: serializeApplied(applied.referentiegroepen),
        },
        enabled: isReady,
        fetcher: fetchBenchmark,
    });
}
