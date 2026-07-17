import { ChartCard } from "@/components/charts/chart-card";
import { ResultCard } from "@/components/charts/result-card";
import { type SectionTab, SectionTabs } from "@/components/layout/section-tabs";
import type { BegrotingWeergave } from "../api";
import { useBegroting } from "../hooks/use-begroting";
import { begrotingPagina } from "./begroting-charts";

const begrotingTabs: SectionTab[] = [
    { label: "Begroting", href: "/begroting" },
    { label: "Begroting versus Jaarrekening (per inwoner)", href: "/begroting/begroting-vs-jaarrekening-per-inwoner" },
    { label: "Begroting versus Jaarrekening (absolute bedragen)", href: "/begroting/begroting-vs-jaarrekening-absolute-bedragen" },
];

/**
 * Shared layout for every Begroting page: the section tabs, then a 2-column grid of the
 * Resultaat table, the uitgaven line, and the stacked bars.
 *
 * The three pages are one layout over a different comparison, and `weergave` is the whole of
 * the difference — it travels to the backend, which swaps the category axis and the measure
 * and hands back the same seven cards either way. The grid flows them into rows of two.
 */
export function BegrotingPageView({ weergave }: { weergave: BegrotingWeergave }) {
    const { data, isLoading, error } = useBegroting(weergave);

    if (error) {
        return (
            <div className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary ring-inset">
                <p className="text-md font-semibold text-primary">{error}</p>
                <p className="pt-1 text-sm text-tertiary">Probeer de pagina opnieuw te laden.</p>
            </div>
        );
    }

    const pagina = begrotingPagina(weergave, data);

    return (
        <section className="flex flex-col gap-6">
            <SectionTabs items={begrotingTabs} />
            <div className="grid gap-6 lg:grid-cols-2">
                <ResultCard title="Resultaat" rows={pagina.resultaat} />
                <ChartCard {...pagina.uitgavenPerJaar} isLoading={isLoading} expandable />
                {pagina.kaarten.map((kaart) => (
                    <ChartCard key={kaart.title} {...kaart} isLoading={isLoading} expandable />
                ))}
            </div>
        </section>
    );
}
