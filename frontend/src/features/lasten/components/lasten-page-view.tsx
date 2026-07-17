import { ChartCard } from "@/components/charts/chart-card";
import { DonutComparisonCard } from "@/components/charts/donut-comparison-card";
import { InfoCard } from "@/components/charts/info-card";
import { SectionTabs, type SectionTab } from "@/components/layout/section-tabs";
import type { LastenTaakveld } from "../api";
import { useLasten } from "../hooks/use-lasten";
import { LASTEN_PAGINAS, categorieSeries, donutSide, trendSeries, verdelingCategories } from "./lasten-charts";

const lastenTabs: SectionTab[] = [
    { label: "Alle taakvelden", href: "/lasten" },
    { label: "Bestuur en ondersteuning", href: "/lasten/bestuur-en-ondersteuning" },
    { label: "Veiligheid", href: "/lasten/veiligheid" },
    { label: "Verkeer", href: "/lasten/verkeer" },
    { label: "Economie", href: "/lasten/economie" },
    { label: "Onderwijs", href: "/lasten/onderwijs" },
    { label: "Sport, cultuur en recreatie", href: "/lasten/sport-cultuur-en-recreatie" },
    { label: "Sociaal domein", href: "/lasten/sociaal-domein" },
    { label: "Volksgezondheid en milieu", href: "/lasten/volksgezondheid-en-milieu" },
    { label: "Volkshuisvesting", href: "/lasten/volkshuisvesting" },
];

/**
 * Shared layout for every Lasten page. Renders the section tab navigation, then a 2-column
 * grid: Uitleg + Trend (row 1), Referentiegroep ranking + per-categorie stacked bar (row 2),
 * full-width taakveld donut comparison.
 *
 * The ten pages are one layout over a different slice of the lasten — `taakveld` picks both
 * the copy (LASTEN_PAGINAS) and what the backend measures (iv3/queries.py): "alle" for the
 * overview, or a hoofdtaakveld code.
 */
export function LastenPageView({ taakveld }: { taakveld: LastenTaakveld }) {
    const { data, isLoading, error } = useLasten(taakveld);
    const pagina = LASTEN_PAGINAS[taakveld];

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

    // Your gemeente against its referentiegroep, like the trend line and the report itself —
    // the backend still sends the landelijk bar, and the donuts still fall back to it when
    // nothing has been picked.
    const categorie = data?.categorie ?? null;
    const categorieData = (categorie?.data ?? []).filter((row) => row.key !== "landelijk");

    return (
        <div className="flex flex-col gap-6">
            <SectionTabs items={lastenTabs} />
            <section className="grid gap-6 lg:grid-cols-2">
                <InfoCard title="Uitleg" paragraphs={pagina.uitlegParagraphs} />

                <ChartCard
                    title="Trend"
                    data={data?.trend ?? []}
                    series={trendSeries(data?.cohorten ?? [])}
                    chartType="line"
                    isLoading={isLoading}
                    expandable
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
                        // A referentiegroep can run to every gemeente in the country, so the
                        // bars scroll inside the card rather than stretching it down the page.
                        maxHeight={420}
                        expandable
                    />
                ) : (
                    <InfoCard
                        title="Referentiegroep"
                        paragraphs={["Kies gemeenten in de referentiegroep om hun lasten naast elkaar te zien."]}
                    />
                )}

                <ChartCard
                    title="Lasten per inwoner per categorie"
                    data={categorieData}
                    series={categorieSeries(categorie)}
                    chartType="horizontal-bar"
                    isLoading={isLoading}
                    expandable
                />

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
            </section>
        </div>
    );
}
