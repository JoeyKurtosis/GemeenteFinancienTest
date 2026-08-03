import { ChartCard } from "@/components/charts/chart-card";
import { useGemeentelijkeStand } from "../hooks/use-gemeentelijke-stand";
import { cohortSeries, indexSeries, spuksSeries, verdelingSeries } from "./gemeentelijkestand-charts";

function SectionHeading({ children }: { children: string }) {
    return <h2 className="pb-2 text-display-xs font-semibold text-primary">{children}</h2>;
}

export function GemeentelijkeStandRouteView() {
    const { data, isLoading, error } = useGemeentelijkeStand();

    if (error) {
        return (
            <div className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary ring-inset">
                <p className="text-md font-semibold text-primary">{error}</p>
                <p className="pt-1 text-sm text-tertiary">Probeer de pagina opnieuw te laden.</p>
            </div>
        );
    }

    const cohorten = data?.cohorten ?? [];
    const cohorts = cohortSeries(cohorten);
    const index = indexSeries(cohorten);
    const lijn = (metric: string) => data?.lijnen[metric] ?? [];

    const hoofdcategorie = data?.verdeling.hoofdcategorie;
    const hoofdtaakveld = data?.verdeling.hoofdtaakveld;

    return (
        <section className="space-y-10">
            {/* ── Lasten ── */}
            <div className="space-y-6">
                <SectionHeading>Lasten</SectionHeading>
                <div className="grid gap-6 lg:grid-cols-2">
                    <ChartCard
                        title="Gemiddelde uitgaven per inwoner per jaar"
                        data={lijn("uitgaven")}
                        series={cohorts}
                        chartType="line"
                        isLoading={isLoading}
                        expandable
                    />
                    <ChartCard
                        title="Gemiddelde uitgaven binnen het sociaal domein per inwoner per jaar"
                        data={lijn("sociaal")}
                        series={cohorts}
                        chartType="line"
                        isLoading={isLoading}
                        expandable
                    />
                    <ChartCard
                        title="Gemiddelde totale personeelskosten per inwoner per jaar"
                        data={lijn("personeel")}
                        series={cohorts}
                        chartType="line"
                        isLoading={isLoading}
                        expandable
                    />
                    <ChartCard
                        title="Gemiddelde kosten voor inhuur per inwoner per jaar"
                        data={lijn("inhuur")}
                        series={cohorts}
                        chartType="line"
                        isLoading={isLoading}
                        expandable
                    />
                    <ChartCard
                        title="Gemiddelde uitgaven voor verbonden partijen per inwoner per jaar"
                        data={lijn("verbonden")}
                        series={cohorts}
                        chartType="line"
                        isLoading={isLoading}
                        expandable
                    />
                </div>
            </div>

            {/* ── Geïndexeerde toename vs inflatie ── */}
            <div className="space-y-6">
                <SectionHeading>Geïndexeerde toename uitgaven vergeleken met inflatie</SectionHeading>
                <div className="grid gap-6 lg:grid-cols-2">
                    <ChartCard
                        title="Index totale uitgaven vergeleken met prijsinflatie"
                        data={lijn("indexUitgaven")}
                        series={index}
                        chartType="line"
                        valueFormat="index"
                        isLoading={isLoading}
                        expandable
                    />
                    <ChartCard
                        title="Index personeelskosten vergeleken met inkomensinflatie (CAO-lonen)"
                        data={lijn("indexPersoneel")}
                        series={index}
                        chartType="line"
                        valueFormat="index"
                        isLoading={isLoading}
                        expandable
                    />
                </div>
            </div>

            {/* ── Verdeling van Uitgaven ── */}
            <div className="space-y-6">
                <SectionHeading>Verdeling van Uitgaven</SectionHeading>
                {/* A verdeling is read as shares rather than as amounts — what a size class
                    spends its money on, not how much of it there is. The payload is euros
                    either way; `normalize` is what turns the bars into 100% stacks.

                    The two titles are crossed against the breakdowns they carry, and that is
                    the report: its "per hoofdtaakveld" chart has a hoofdcategorie legend
                    (Salarissen, Belastingen, Goederen en diensten) and its "per categorie"
                    chart a hoofdtaakveld one (Bestuur, Veiligheid, Sociaal domein). Matched
                    here rather than corrected, so the page reads as the report it mirrors. */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <ChartCard
                        title="Gemiddelde verdeling uitgaven per hoofdtaakveld"
                        data={hoofdcategorie?.data ?? []}
                        series={verdelingSeries(hoofdcategorie)}
                        chartType="horizontal-bar"
                        valueFormat="percent"
                        normalize
                        isLoading={isLoading}
                        expandable
                    />
                    <ChartCard
                        title="Gemiddelde verdeling uitgaven per categorie"
                        data={hoofdtaakveld?.data ?? []}
                        series={verdelingSeries(hoofdtaakveld)}
                        chartType="horizontal-bar"
                        valueFormat="percent"
                        normalize
                        isLoading={isLoading}
                        expandable
                    />
                </div>
            </div>

            {/* ── SPUKS ── */}
            <div className="space-y-6">
                <SectionHeading>SPUKS</SectionHeading>
                <div className="grid gap-6 lg:grid-cols-2">
                    <ChartCard
                        title="Gemiddelde bedrag SPUKS per inwoner"
                        data={data?.spuks ?? []}
                        series={spuksSeries}
                        chartType="horizontal-bar"
                        showLegend={false}
                        isLoading={isLoading}
                        expandable
                    />
                </div>
            </div>

            {/* ── Inkomsten ── */}
            <div className="space-y-6">
                <SectionHeading>Inkomsten</SectionHeading>
                <div className="grid gap-6 lg:grid-cols-2">
                    <ChartCard
                        title="Inkomsten vanuit het rijk per inwoner per jaar"
                        data={lijn("rijk")}
                        series={cohorts}
                        chartType="line"
                        isLoading={isLoading}
                        expandable
                    />
                    <ChartCard
                        title="Inkomsten vanuit lokale heffingen per inwoner per jaar"
                        data={lijn("heffingen")}
                        series={cohorts}
                        chartType="line"
                        isLoading={isLoading}
                        expandable
                    />
                    <ChartCard
                        title="Inkomsten vanuit het rijk SPUKS per inwoner per jaar"
                        data={lijn("spuks")}
                        series={cohorts}
                        chartType="line"
                        isLoading={isLoading}
                        expandable
                    />
                </div>
            </div>

            {/* ── Overschot of tekort ── */}
            <div className="space-y-6">
                <SectionHeading>Overschot of tekort</SectionHeading>
                <div className="grid gap-6 lg:grid-cols-2">
                    <ChartCard
                        title="Gemiddeld overschot of tekort (zonder reservemutaties)"
                        data={lijn("overschot")}
                        series={cohorts}
                        chartType="line"
                        valueFormat="percent"
                        isLoading={isLoading}
                        expandable
                    />
                </div>
            </div>
        </section>
    );
}
