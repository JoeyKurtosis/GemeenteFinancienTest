import { useEffect, useMemo, useState } from "react";
import { serializeApplied, useFilters } from "@/features/filters";
import { type Benchmark, fetchBenchmark } from "../api";

/**
 * The page's data, refetched whenever the *applied* filters change — the pending
 * selections in the sidebar do not reach this until the user presses "Toepassen".
 *
 * The applied filters live in the URL (see FiltersProvider), so a filtered view of this
 * page can be shared and survives a reload.
 */
export function useBenchmark() {
    const { applied, isReady } = useFilters();

    const [data, setData] = useState<Benchmark | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // `referentiegroepen` is a react-aria Selection: either a Set or the literal "all", the
    // latter meaning every gemeente in the year — which the request carries as the `alle`
    // sentinel rather than naming the ~342 codes, so this no longer waits on options.gemeenten
    // and the fetch no longer refires once they arrive. See ChartView._referentie.
    const referentie = useMemo(() => serializeApplied(applied.referentiegroepen), [applied.referentiegroepen]);

    const { jaar, verslagsoort, gemeente } = applied;

    useEffect(() => {
        // Nothing worth asking yet — the URL is still being settled, and every question asked of
        // it before then is thrown away. See FiltersProvider's isReady.
        if (!isReady) return;

        const controller = new AbortController();

        const load = async () => {
            setIsLoading(true);
            try {
                const next = await fetchBenchmark({
                    jaar,
                    verslagsoort,
                    gemeente,
                    referentie,
                    signal: controller.signal,
                });
                setData(next);
                setError(null);
            } catch {
                // An abort is this effect superseding itself, not a failure: the run that
                // replaced it is already in flight and owns the state from here.
                if (controller.signal.aborted) return;
                setData(null);
                setError("Gegevens konden niet worden geladen");
            } finally {
                if (!controller.signal.aborted) setIsLoading(false);
            }
        };

        load();
        return () => controller.abort();
    }, [isReady, jaar, verslagsoort, gemeente, referentie]);

    return { data, isLoading, error };
}
