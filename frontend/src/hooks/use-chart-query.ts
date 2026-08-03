import { keepPreviousData, useQuery } from "@tanstack/react-query";

/**
 * What a chart page's hook hands its route view. Kept to these three so the route views did
 * not change when the hooks moved to React Query — they still read `{ data, isLoading, error }`.
 */
export interface ChartQueryResult<TData> {
    data: TData | null;
    isLoading: boolean;
    error: string | null;
}

interface ChartQueryOptions<TData, TParams extends object> {
    /** Names the endpoint in the cache key: "benchmark", "lasten", … */
    feature: string;
    /** The applied filters this request is made of. Doubles as the rest of the cache key. */
    params: TParams;
    /** FiltersProvider's isReady — see the note on `enabled` below. */
    enabled: boolean;
    fetcher: (params: TParams & { signal: AbortSignal }) => Promise<TData>;
}

/**
 * One chart page's data, cached across navigations.
 *
 * All six chart pages ask the same question in the same shape — one endpoint, the applied
 * filters, the whole page in a single response — so they share this rather than repeating a
 * fetch effect six times.
 *
 * What it changes versus fetching by hand:
 *
 * - **A page already visited costs nothing.** The ten Lasten tabs are ten requests, and before
 *   this, going back to one you had already opened refetched it and showed the skeleton again.
 *   The figures behind them are a year old — CBS publishes annually — so the cache never goes
 *   stale within a session (staleTime: Infinity, set on the QueryClient in main.tsx).
 * - **The charts stop blanking on every filter change.** `keepPreviousData` leaves the previous
 *   response on screen while the new one loads, so pressing Toepassen redraws the charts instead
 *   of replacing all fourteen of them with grey blocks and re-mounting them a moment later.
 *
 * `params` goes into the queryKey as an object. React Query hashes it with its keys sorted, so
 * a fresh object literal every render is fine — identity does not matter, only the values do.
 * That is what lets the callers drop their useMemo'd dependency lists.
 *
 * `enabled` carries FiltersProvider's isReady: until the URL has settled there is nothing worth
 * asking, and asking anyway put three or four copies of the same heavy request on a cold load.
 * A disabled query stays pending, so `isLoading` is true and the page shows its skeleton — the
 * same thing the hand-written `if (!isReady) return` did.
 */
export function useChartQuery<TData, TParams extends object>({
    feature,
    params,
    enabled,
    fetcher,
}: ChartQueryOptions<TData, TParams>): ChartQueryResult<TData> {
    const query = useQuery({
        queryKey: [feature, params],
        // React Query's signal aborts a superseded request for us, which is what each of these
        // hooks used to hold an AbortController to do.
        queryFn: ({ signal }) => fetcher({ ...params, signal }),
        enabled,
        placeholderData: keepPreviousData,
    });

    return {
        // On failure the route views draw an error card instead of the page, so they must not
        // also be handed a stale response to draw it from.
        data: query.isError ? null : (query.data ?? null),
        // isPending, not isFetching: true only when there is nothing to show yet. A refetch over
        // cached data leaves this false, which is what keeps the charts up during a refetch.
        isLoading: query.isPending,
        error: query.isError ? "Gegevens konden niet worden geladen" : null,
    };
}
