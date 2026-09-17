import { ChartCardWithDetails } from "@/components/charts/chart-card-with-details";
import { useChartComments } from "@/features/comments";
import { useFilters } from "@/features/filters";
import { useManagementoverzicht } from "../hooks/use-managementoverzicht";
import { managementoverzichtPagina } from "./managementoverzicht-charts";

/**
 * Het managementoverzicht als sectie van In één oogopslag: de vijf kaarten onder één kop,
 * met een eigen fetch (useManagementoverzicht) naast die van de begrotingskaarten erboven.
 *
 * De twee tussenkopjes waaronder dit ooit een eigen pagina was — "Complete Begroting" en
 * "Salarislasten" — zijn vervallen; wat de eerste van de twee zei, uit welk verslag de cijfers
 * komen, staat nu als ondertitel bij de sectiekop.
 */
export function ManagementoverzichtSection() {
    const { data, isLoading, error } = useManagementoverzicht();
    const { options } = useFilters();

    const pagina = managementoverzichtPagina(data);
    const kaarten = [...pagina.begroting, ...pagina.salarislasten];

    const { commentsMap, invalidate } = useChartComments(kaarten.map((kaart) => `managementoverzicht:${kaart.title}`));

    if (error) {
        return (
            <div className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary ring-inset">
                <p className="text-md font-semibold text-primary">{error}</p>
                <p className="pt-1 text-sm text-tertiary">Probeer de pagina opnieuw te laden.</p>
            </div>
        );
    }

    // De verslagsoort waaruit de payload werkelijk getrokken is, niet die de sidebar vroeg:
    // ChartView._resolve_verslagsoort kan voor een jaar zonder die soort een andere code kiezen.
    // Gelabeld vanuit de filteropties in plaats van uit een eigen suffixtabel, zodat "Begroting"
    // en "Jaarrekening" op precies één plek gespeld worden — de VERSLAGSOORT_LABELS van de backend.

    return (
        <section className="space-y-6">
            <div>
                <h2 className="text-display-xs font-semibold text-primary">Managementoverzicht</h2>
            </div>

            {kaarten.map((kaart) => (
                <ChartCardWithDetails
                    key={kaart.title}
                    {...kaart}
                    isLoading={isLoading}
                    expandable
                    chartId={`managementoverzicht:${kaart.title}`}
                    comment={commentsMap.get(`managementoverzicht:${kaart.title}`)}
                    onCommentChange={invalidate}
                />
            ))}
        </section>
    );
}
