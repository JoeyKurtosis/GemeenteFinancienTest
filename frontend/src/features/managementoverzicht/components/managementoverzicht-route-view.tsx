import { ChartCardWithDetails } from "@/components/charts/chart-card-with-details";
import { useManagementoverzicht } from "../hooks/use-managementoverzicht";
import { managementoverzichtPagina } from "./managementoverzicht-charts";

export function ManagementoverzichtRouteView() {
    const { data, isLoading, error } = useManagementoverzicht();

    if (error) {
        return (
            <div className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary ring-inset">
                <p className="text-md font-semibold text-primary">{error}</p>
                <p className="pt-1 text-sm text-tertiary">Probeer de pagina opnieuw te laden.</p>
            </div>
        );
    }

    const pagina = managementoverzichtPagina(data);

    return (
        <section className="space-y-10">
            {/* ── Complete Begroting ── */}
            <div className="space-y-6">
                <h2 className="pb-2 text-display-xs font-semibold text-primary">Complete Begroting</h2>

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
