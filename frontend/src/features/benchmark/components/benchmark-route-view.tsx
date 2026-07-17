import { ChartCard } from "@/components/charts/chart-card";
import { DonutComparisonCard } from "@/components/charts/donut-comparison-card";
import { InfoCard } from "@/components/charts/info-card";
import { useBenchmark } from "../hooks/use-benchmark";
import { donutSide, personeelSeries, taakveldCategories, trendSeries, uitlegParagraphs } from "./benchmark-charts";

export function BenchmarkRouteView() {
    const { data, isLoading, error } = useBenchmark();

    if (error) {
        return (
            <div className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary ring-inset">
                <p className="text-md font-semibold text-primary">{error}</p>
                <p className="pt-1 text-sm text-tertiary">Probeer de pagina opnieuw te laden.</p>
            </div>
        );
    }

    const taakvelden = data?.taakvelden ?? null;
    const referentiegroep = data?.referentiegroep ?? [];

    // The categorie chart compares your gemeente against its referentiegroep only, like the
    // Power BI report; the landelijk cohort is dropped (the backend still sends its bar).
    const landelijkLabel = data?.cohorten.find((cohort) => cohort.key === "landelijk")?.label;
    const categorie = (data?.categorie ?? []).filter((row) => row.name !== landelijkLabel);

    return (
        <section className="grid gap-6 lg:grid-cols-2">
            <InfoCard title="Uitleg" paragraphs={uitlegParagraphs} />

            <ChartCard title="Trend" data={data?.trend ?? []} series={trendSeries(data?.cohorten ?? [])} chartType="line" isLoading={isLoading} expandable />

            {/* Without a referentiegroep there are no gemeenten to draw, so the card says so
                rather than showing an empty chart. */}
            {referentiegroep.length > 0 || isLoading ? (
                <ChartCard
                    title="Referentiegroep"
                    data={referentiegroep}
                    series={personeelSeries}
                    chartType="horizontal-bar"
                    isLoading={isLoading}
                    // A referentiegroep can run to every gemeente in the country, so the bars
                    // scroll inside the card rather than stretching it down the page.
                    maxHeight={420}
                    expandable
                />
            ) : (
                <InfoCard title="Referentiegroep" paragraphs={["Kies gemeenten in de referentiegroep om hun personele lasten naast elkaar te zien."]} />
            )}

            <ChartCard
                title="Personele lasten per inwoner per categorie"
                data={categorie}
                series={personeelSeries}
                chartType="horizontal-bar"
                isLoading={isLoading}
                expandable
            />

            {taakvelden && (
                <DonutComparisonCard
                    title="Personele lasten per inwoner per taakveld"
                    categories={taakveldCategories(taakvelden)}
                    left={donutSide(taakvelden, taakvelden.links)}
                    right={donutSide(taakvelden, taakvelden.rechts)}
                    expandable
                    className="col-span-2"
                />
            )}
        </section>
    );
}
