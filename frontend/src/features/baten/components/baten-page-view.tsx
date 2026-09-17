import { ChartCard } from "@/components/charts/chart-card";
import { DonutComparisonCard } from "@/components/charts/donut-comparison-card";
import { InfoCard } from "@/components/charts/info-card";
import { SectionTabs, type SectionTab } from "@/components/layout/section-tabs";
import { useChartComments } from "@/features/comments";
import type { BatenBron } from "../api";
import { useBaten } from "../hooks/use-baten";
import { BATEN_PAGINAS, donutSide, trendSeries, verdelingCategories } from "./baten-charts";

const batenTabs: SectionTab[] = [
    { label: "Alle inkomstenbronnen", href: "/baten" },
    { label: "Overige baten rijk", href: "/baten/overige-baten-rijk" },
    { label: "Lokale heffingen", href: "/baten/lokale-heffingen" },
    { label: "Overige inkomsten", href: "/baten/overige-inkomsten" },
];

/**
 * Shared layout for every Baten page. Renders the section tab navigation, then composes the
 * Untitled UI chart cards in a 2-column grid: the full-width donut comparison, then Trend and
 * the Referentiegroep ranking side by side. The page's uitleg is not in the grid — it sits
 * under the title in the PageHeader, fed by each route's `subContent` (baten-uitleg.tsx).
 *
 * The four pages are one layout over a different bron of income — `bron` picks both the copy
 * (BATEN_PAGINAS) and what the backend measures (iv3/queries.py).
 */
export function BatenPageView({ bron }: { bron: BatenBron }) {
    const { data, isLoading, error } = useBaten(bron);
    const pagina = BATEN_PAGINAS[bron];

    if (error) {
        return (
            <div className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary ring-inset">
                <p className="text-md font-semibold text-primary">{error}</p>
                <p className="pt-1 text-sm text-tertiary">Probeer de pagina opnieuw te laden.</p>
            </div>
        );
    }

    const verdeling = data?.verdeling ?? null;
    const referentiegroep = data?.referentiegroep ?? [];

    // The donut's heading is the page's own copy rather than a fixed one, so its id is built
    // from it — the bron on the end is what keeps the four pages' notes apart.
    const donutChartId = `baten:${pagina.donutTitle}:${bron}`;
    const chartIds = [`baten:Referentiegroep:${bron}`, `baten:Trend:${bron}`, donutChartId];
    const { commentsMap, invalidate } = useChartComments(chartIds);

    return (
        <div className="flex flex-col gap-6">
            <SectionTabs items={batenTabs} label="Baten" />
            <section className="grid gap-6 lg:grid-cols-2">
                {(verdeling || isLoading) && (
                    <DonutComparisonCard
                        title={pagina.donutTitle}
                        isLoading={isLoading || !verdeling}
                        categories={verdeling ? verdelingCategories(verdeling) : []}
                        left={verdeling ? donutSide(verdeling, verdeling.links) : null}
                        right={verdeling ? donutSide(verdeling, verdeling.rechts) : null}
                        expandable
                        className="col-span-2"
                        chartId={donutChartId}
                        comment={commentsMap.get(donutChartId)}
                        onCommentChange={invalidate}
                    />
                )}

                <ChartCard
                    title="Trend"
                    data={data?.trend ?? []}
                    series={trendSeries(data?.cohorten ?? [])}
                    chartType="line"
                    isLoading={isLoading}
                    expandable
                    chartId={`baten:Trend:${bron}`}
                    comment={commentsMap.get(`baten:Trend:${bron}`)}
                    onCommentChange={invalidate}
                />

                {/* Without a referentiegroep there are no gemeenten to draw, so the card says
                    so rather than showing an empty chart. */}
                {referentiegroep.length > 0 || isLoading ? (
                    <ChartCard
                        title="Referentiegroep"
                        data={referentiegroep}
                        series={pagina.referentiegroepSeries}
                        chartType="horizontal-bar"
                        showLegend={false}
                        isLoading={isLoading}
                        maxHeight={420}
                        expandable
                        chartId={`baten:Referentiegroep:${bron}`}
                        comment={commentsMap.get(`baten:Referentiegroep:${bron}`)}
                        onCommentChange={invalidate}
                    />
                ) : (
                    <InfoCard
                        title="Referentiegroep"
                        paragraphs={["Kies gemeenten in de referentiegroep om hun baten naast elkaar te zien."]}
                    />
                )}
            </section>
        </div>
    );
}
