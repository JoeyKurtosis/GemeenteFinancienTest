import type { ChartSeries } from "@/components/charts/chart-card";
import type { DonutSlice } from "@/components/charts/donut-chart";
import type { Benchmark, Cohort, TaakveldZijde } from "../api";

// ── Colors (Untitled UI utility tokens) ──────────────────────────────────────

const COLORS = {
    brand: "var(--color-utility-brand-600)", // teal
    slate: "var(--color-utility-slate-700)", // dark navy
    sky: "var(--color-utility-sky-600)",
    orange: "var(--color-utility-orange-600)",
    indigo: "var(--color-utility-indigo-600)",
    pink: "var(--color-utility-pink-600)",
    purple: "var(--color-utility-purple-600)",
    green: "var(--color-utility-green-600)",
    fuchsia: "var(--color-utility-fuchsia-600)",
};

// ── Uitleg ───────────────────────────────────────────────────────────────────

export const uitlegParagraphs = [
    "Hier zie je een vergelijking van de personele lasten van jouw gemeente en de gekozen referentiegroep.",
    "De personele lasten bestaan uit 2 kostencategorieën ('1.1 Salarissen en sociale lasten' & '3.5.1 - Ingeleend personeel').",
];

// ── Series ───────────────────────────────────────────────────────────────────

/** The cohorts the trend line compares; the backend omits the ones not selected. */
const COHORT_COLORS: Record<string, string> = {
    gemeente: COLORS.brand,
    referentie: COLORS.orange,
    landelijk: COLORS.slate,
};

export function trendSeries(cohorten: Cohort[]): ChartSeries[] {
    // The trend compares your gemeente against its referentiegroep only, mirroring the
    // Power BI report; the landelijk cohort is dropped here (the backend still sends it).
    return cohorten
        .filter((cohort) => cohort.key !== "landelijk")
        .map((cohort) => ({
            key: cohort.key,
            name: cohort.label,
            color: COHORT_COLORS[cohort.key] ?? COLORS.slate,
        }));
}

/** The two categorieën the personele lasten are made of — the stack on every bar chart. */
export const personeelSeries: ChartSeries[] = [
    { key: "salarissen", name: "L1.1 Salarissen en sociale lasten", color: COLORS.brand },
    { key: "inhuur", name: "L3.5.1 Ingeleend personeel", color: COLORS.slate },
];

// ── Donut pair ───────────────────────────────────────────────────────────────

// The slices are keyed by hoofdtaakveld code, and the labels come from the backend (they
// live in iv3/definitions.py, next to the codes they describe). Only the colors are here.
const TAAKVELD_COLORS = [
    COLORS.brand,
    COLORS.slate,
    COLORS.orange,
    COLORS.green,
    COLORS.indigo,
    COLORS.sky,
    COLORS.purple,
    COLORS.pink,
    COLORS.fuchsia,
];

const color = (index: number) => TAAKVELD_COLORS[index % TAAKVELD_COLORS.length];

type Taakvelden = NonNullable<Benchmark["taakvelden"]>;

/** Both donuts share one legend. */
export function taakveldCategories(taakvelden?: Taakvelden | null) {
    return (taakvelden?.series ?? []).map((serie, index) => ({ name: serie.name, color: color(index) }));
}

export function donutSide(taakvelden: Taakvelden, zijde: TaakveldZijde) {
    const data: DonutSlice[] = taakvelden.series.map((serie, index) => ({
        name: serie.name,
        value: zijde.waarden[serie.key] ?? 0,
        color: color(index),
    }));

    return { label: zijde.label, centerValue: euro(zijde.totaal), data };
}

/** Euro per inhabitant, whole euros — the cents are noise at this scale. */
const euro = (bedrag: number | null) =>
    bedrag === null ? "—" : `€ ${Math.round(bedrag).toLocaleString("nl-NL")}`;
