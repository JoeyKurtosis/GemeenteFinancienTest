import { type ChartSeries, type ChartType, formatValue, type ValueFormat } from "@/components/charts/chart-card";
import type { Begroting, BegrotingWeergave, Cohort, VerdelingPayload } from "../api";

// ── Colors (Untitled UI utility tokens) ──────────────────────────────────────

const COLORS = {
    brand: "var(--color-utility-brand-600)", // teal
    sky: "var(--color-utility-sky-600)",
    orange: "var(--color-utility-orange-600)",
    indigo: "var(--color-utility-indigo-600)",
    pink: "var(--color-utility-pink-600)",
    slate: "var(--color-utility-slate-600)",
    purple: "var(--color-utility-purple-600)",
    green: "var(--color-utility-green-600)",
    amber: "var(--color-utility-amber-600)",
    blue: "var(--color-utility-blue-600)",
    fuchsia: "var(--color-utility-fuchsia-600)",
};

/**
 * The reeksen the pages draw: your gemeente against its referentiegroep on the overzicht,
 * what was planned against what happened on a comparison page.
 */
const COHORT_COLORS: Record<string, string> = {
    gemeente: COLORS.brand,
    referentie: COLORS.orange,
    begroting: COLORS.brand,
    jaarrekening: COLORS.sky,
};

/** The line series for the cohorts the backend actually returned, in its order. */
export function cohortSeries(cohorten: Cohort[]): ChartSeries[] {
    return cohorten.map((cohort) => ({
        key: cohort.key,
        name: cohort.label,
        color: COHORT_COLORS[cohort.key] ?? COLORS.slate,
    }));
}

// The stacked bars are keyed by IV3 code, and the labels come from the backend (they live
// in iv3/definitions.py, next to the codes they describe). Only the colors are chosen here.
const VERDELING_COLORS = [
    COLORS.brand,
    COLORS.sky,
    COLORS.orange,
    COLORS.indigo,
    COLORS.pink,
    COLORS.slate,
    COLORS.purple,
    COLORS.green,
    COLORS.amber,
    COLORS.blue,
    COLORS.fuchsia,
];

export function verdelingSeries(verdeling?: VerdelingPayload | null): ChartSeries[] {
    return (verdeling?.series ?? []).map((serie, index) => ({
        key: serie.key,
        name: serie.name,
        color: VERDELING_COLORS[index % VERDELING_COLORS.length],
    }));
}

const euro = new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
});

/** The Resultaat card prints its figures rather than plotting them. */
export const formatEuro = (waarde: number | null): string => (waarde === null ? "—" : euro.format(waarde));

/** The same card in absolute bedragen, where the figures run to ten digits. */
export const formatEuroCompact = (waarde: number | null): string =>
    waarde === null ? "—" : formatValue(waarde, "euro-compact");

// ── The page as a list of cards ──────────────────────────────────────────────

/** One chart on the page, ready to spread onto a ChartCard. */
export interface BegrotingKaart {
    title: string;
    data: Record<string, unknown>[];
    series: ChartSeries[];
    chartType: ChartType;
    valueFormat: ValueFormat;
}

export interface BegrotingPagina {
    resultaat: { label: string; inkomsten: string; uitgaven: string; resultaat: string }[];
    uitgavenPerJaar: BegrotingKaart;
    /** The stacked bars, in the order the grid lays them out. */
    kaarten: BegrotingKaart[];
}

const bar = (
    title: string,
    valueFormat: ValueFormat,
    verdeling?: VerdelingPayload | null,
): BegrotingKaart => ({
    title,
    data: verdeling?.data ?? [],
    series: verdelingSeries(verdeling),
    chartType: "horizontal-bar",
    valueFormat,
});

/**
 * The cards a page puts on the grid, in render order.
 *
 * The same seven for every weergave: the backend has already swapped the category axis and
 * the measure by the time the payload gets here, so no chart has to be chosen. The order is
 * what the grid flows into rows of two, and the report lays them out the same way.
 *
 * `weergave` survives here only to say how a figure reads — absolute bedragen run to ten
 * digits, which no axis or bar segment can hold, so they are rounded off to millions.
 */
export function begrotingPagina(weergave: BegrotingWeergave, data: Begroting | null): BegrotingPagina {
    const absoluut = weergave === "absolute-bedragen";
    const valueFormat: ValueFormat = absoluut ? "euro-compact" : "euro";
    const format = absoluut ? formatEuroCompact : formatEuro;

    return {
        resultaat: (data?.resultaat ?? []).map((rij) => ({
            label: rij.label,
            inkomsten: format(rij.inkomsten),
            uitgaven: format(rij.uitgaven),
            resultaat: format(rij.resultaat),
        })),
        uitgavenPerJaar: {
            title: "Uitgaven per jaar",
            data: data?.uitgavenPerJaar ?? [],
            series: cohortSeries(data?.cohorten ?? []),
            chartType: "area",
            valueFormat,
        },
        kaarten: [
            bar("Inkomsten per bron", valueFormat, data?.inkomsten),
            bar("Uitgaven per hoofdtaakveld", valueFormat, data?.verdeling.hoofdtaakveld),
            bar("Lokale heffingen", valueFormat, data?.verdeling.heffingen),
            bar("Uitgaven per kostensoort", valueFormat, data?.verdeling.hoofdcategorie),
            bar("Overige inkomsten", valueFormat, data?.verdeling.overigeInkomsten),
        ],
    };
}
