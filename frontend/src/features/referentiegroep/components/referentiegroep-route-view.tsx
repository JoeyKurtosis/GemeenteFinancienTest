import { Suspense, lazy } from "react";
import { useReferentiegroepSamenstelling } from "../hooks/use-referentiegroep-samenstelling";
import { ReferentiegroepFilterBar } from "./referentiegroep-filter-bar";

// Lazy: the map carries the 352 gemeente outlines, ~254 KB of path data. The router builds a
// single bundle for the whole app, so a static import would put the country's geometry on
// every page for the sake of this one.
const NetherlandsMap = lazy(() => import("./netherlands-map"));

export function ReferentieGroepRouteView() {
    // Owned here because the filter bar and the map must agree exactly on what is in view and
    // what is chosen — if they disagreed, one of them would be lying. None of it reaches the
    // dashboard until Toepassen.
    const samenstelling = useReferentiegroepSamenstelling();

    return (
        <section className="space-y-8">
            <div className="flex gap-6 max-md:flex-wrap">
                <div>
                    <h3 className="mb-2 font-semibold text-primary">Referentiegroep</h3>
                    <p className="max-w-prose text-sm text-secondary">
                        Door het hele dashboard heen, kun je je eigen gemeente vergelijken met een referentiegroep. De referentiegroep kun je op elke pagina
                        samenstellen door gemeenten aan te klikken in de slicer in de zijbalk. Een uitgebreidere manier om een referentiegroep samen te stellen
                        is via deze speciale &quot;referentiegroep-pagina&quot;.
                    </p>
                </div>
                <div>
                    <h3 className="mb-2 font-semibold text-primary">Uitleg</h3>
                    <p className="max-w-prose text-sm text-secondary">
                        Op deze pagina kun je je eigen referentiegroep samenstellen. Met de filters kies je in één keer een hele groep: wat overblijft na het
                        filteren wordt je referentiegroep, en bij een provincie zoomt de kaart er meteen op in. Daarna verfijn je met de kaart — klik een
                        gemeente aan om alleen die te kiezen, shift+klik om er een toe te voegen of te verwijderen. Klik op Toepassen om je selectie door te
                        voeren.
                    </p>
                </div>
            </div>

            <ReferentiegroepFilterBar samenstelling={samenstelling} />

            {/* The fallback matches the map's own box, so the page does not jump when it loads. */}
            <Suspense fallback={<div className="h-[clamp(420px,72vh,860px)] w-full animate-pulse rounded-[12px] bg-secondary" />}>
                <NetherlandsMap samenstelling={samenstelling} />
            </Suspense>
        </section>
    );
}
