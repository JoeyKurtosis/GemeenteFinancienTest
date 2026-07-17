import { useEffect, useMemo, useState } from "react";
import { serializeCodes, useFilters } from "@/features/filters";
import { type GemeentelijkeStand, fetchGemeentelijkeStand } from "../api";

/**
 * The page's data, refetched whenever the *applied* filters change — the pending
 * selections in the sidebar do not reach this until the user presses "Toepassen".
 *
 * The applied filters live in the URL (see FiltersProvider), so a filtered view of this
 * page can be shared and survives a reload.
 */
export function useGemeentelijkeStand() {
    const { applied, options, isReady } = useFilters();

    const [data, setData] = useState<GemeentelijkeStand | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // The multi-selects are react-aria Selections: either a Set or the literal "all", the
    // latter meaning every option there is.
    //
    // Still expanded here, unlike the referentiegroep on the other pages: there is no `alle`
    // sentinel for the inwonergroepen, because an empty `inwoner` already means something else
    // entirely — one landelijk line rather than five, see _cohort_labels. Expanding is safe now
    // that isReady holds the fetch until the options are in.
    const inwoner = useMemo(() => {
        const ids =
            applied.inwonergroepen === "all"
                ? options.inwonergroepen.map((option) => option.id)
                : [...applied.inwonergroepen].map(String);
        return serializeCodes(ids);
    }, [applied.inwonergroepen, options.inwonergroepen]);

    // No gemeente or referentiegroep: the charts compare inwonergroepen and nothing else.
    const { jaar, verslagsoort, reservemutaties } = applied;

    useEffect(() => {
        // Nothing worth asking yet — the URL is still being settled, and every question asked of
        // it before then is thrown away. See FiltersProvider's isReady.
        if (!isReady) return;

        const controller = new AbortController();

        const load = async () => {
            setIsLoading(true);
            try {
                const next = await fetchGemeentelijkeStand({
                    jaar,
                    verslagsoort,
                    inwoner,
                    reserve: reservemutaties,
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
    }, [isReady, jaar, verslagsoort, inwoner, reservemutaties]);

    return { data, isLoading, error };
}
