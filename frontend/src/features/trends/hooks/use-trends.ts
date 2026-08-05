import { serializeApplied, serializeCodes, useFilters } from "@/features/filters";
import { useChartQuery } from "@/hooks/use-chart-query";
import { fetchTrends } from "../api";

/**
 * The page's data, refetched whenever the *applied* filters change — the pending
 * selections in the sidebar do not reach this until the user presses "Toepassen".
 *
 * The applied filters live in the URL (see FiltersProvider), so a filtered view of this
 * page can be shared and survives a reload. They are also the cache key — see useChartQuery.
 */
export function useTrends() {
    const { applied, options, isReady } = useFilters();

    // The multi-selects are react-aria Selections: either a Set or the literal "all", the
    // latter meaning every option there is.
    //
    // Still expanded here, unlike the referentiegroep below: there is no `alle` sentinel for the
    // inwonergroepen, because an empty `inwoner` already means something else entirely — one
    // landelijk line rather than five, see _cohort_labels. Expanding is safe now that isReady
    // holds the fetch until the options are in.
    const ids =
        applied.inwonergroepen === "all"
            ? options.inwonergroepen.map((option) => option.id)
            : [...applied.inwonergroepen].map(String);

    return useChartQuery({
        feature: "trends",
        params: {
            // No gemeente: the charts compare inwonergroepen, so there is no single-gemeente line.
            jaar: applied.jaar,
            verslagsoort: applied.verslagsoort,
            inwoner: serializeCodes(ids),
            // The gemeenten the averages are taken over — the sidebar's "Gemeente" on this route.
            // Unlike the inwonergroepen above this keeps the `alle` sentinel rather than expanding
            // it: the backend resolves it, and expanding would make this wait on /filters/ twice.
            referentie: serializeApplied(applied.referentiegroepen),
            reserve: applied.reservemutaties,
        },
        enabled: isReady,
        fetcher: fetchTrends,
    });
}
