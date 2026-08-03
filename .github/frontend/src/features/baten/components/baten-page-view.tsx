import { ChartCard } from "@/components/charts/chart-card";
import { DonutComparisonCard } from "@/components/charts/donut-comparison-card";
import { InfoCard } from "@/components/charts/info-card";
import { SectionTabs, type SectionTab } from "@/components/layout/section-tabs";
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
 * Untitled UI chart cards in a 2-column grid: Uitleg (top-left), Referentiegroep ranking
 * (top-right), full-width donut comparison, then Trend.
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

    return (
        <div className="flex flex-col gap-6">
            <SectionTabs items={batenTabs} />
            <section className="grid gap-6 lg:grid-cols-2">
                <InfoCard title="Uitleg" paragraphs={pagina.uitlegParagraphs} />

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
                        // A referentiegroep can run to every gemeente in the country, so the
                        // bars scroll inside the card rather than stretching it down the page.
                        maxHeight={420}
                        expandable
                    />
                ) : (
                    <InfoCard
                        title="Referentiegroep"
                        paragraphs={["Kies gemeenten in de referentiegroep om hun baten naast elkaar te zien."]}
                    />
                )}

                {verdeling && (
                    <DonutComparisonCard
                        title={pagina.donutTitle}
                        categories={verdelingCategories(verdeling)}
                        left={donutSide(verdeling, verdeling.links)}
                        right={donutSide(verdeling, verdeling.rechts)}
                        expandable
                        className="col-span-2"
                    />
                )}

                <ChartCard
                    title="Trend"
                    data={data?.trend ?? []}
                    series={trendSeries(data?.cohorten ?? [])}
                    chartType="line"
                    isLoading={isLoading}
                    expandable
                    className="col-span-2"
                />
            </section>
        </div>
    );
}
