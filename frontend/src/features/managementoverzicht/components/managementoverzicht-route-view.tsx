import { ChartCardWithDetails } from "@/components/charts/chart-card-with-details";
import { useFilters } from "@/features/filters";
import { useManagementoverzicht } from "../hooks/use-managementoverzicht";
import { managementoverzichtPagina } from "./managementoverzicht-charts";

/** The heading before a verslagsoort is known, and the fallback while one is being fetched. */
const STANDAARD_TOTALEN_KOP = "Complete Begroting";

export function ManagementoverzichtRouteView() {
    const { data, isLoading, error } = useManagementoverzicht();
    const { options } = useFilters();

    if (error) {
        return (
            <div className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary ring-inset">
                <p className="text-md font-semibold text-primary">{error}</p>
                <p className="pt-1 text-sm text-tertiary">Probeer de pagina opnieuw te laden.</p>
            </div>
        );
    }

    const pagina = managementoverzichtPagina(data);

    // The verslagsoort the payload was actually drawn from, not the one the sidebar asked for:
    // ChartView._resolve_verslagsoort may substitute another code for a year that has none.
    // Labelled off the filter options rather than from a suffix table of its own, so "Begroting"
    // and "Jaarrekening" are spelled in exactly one place — the backend's VERSLAGSOORT_LABELS.
    const totalenKop = options.verslagsoorten.find((optie) => optie.id === data?.verslagsoort)?.label;

    return (
        <section className="space-y-10">
            {/* ── Complete Begroting / Complete Jaarrekening ── */}
            <div className="space-y-6">
                <h2 className="pb-2 text-display-xs font-semibold text-primary">
                    {totalenKop ? `Complete ${totalenKop}` : STANDAARD_TOTALEN_KOP}
                </h2>

                {pagina.begroting.map((kaart) => (
                    <ChartCardWithDetails key={kaart.title} {...kaart} isLoading={isLoading} expandable />
                ))}
            </div>

            {/* ── Salarislasten ── */}
            <div className="space-y-6">
                <h2 className="pb-2 text-display-xs font-semibold text-primary">Salarislasten</h2>

                {pagina.salarislasten.map((kaart) => (
                    <ChartCardWithDetails key={kaart.title} {...kaart} isLoading={isLoading} expandable />
                ))}
            </div>
        </section>
    );
}
