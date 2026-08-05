import type { ChartSeries } from "@/components/charts/chart-card";
import type { Cohort, VerdelingPayload } from "../api";

// ── Colors (Untitled UI utility tokens) ──────────────────────────────────────

const COLORS = {
    brand: "var(--color-utility-brand-600)", // teal
    sky: "var(--color-utility-sky-600)",
    orange: "var(--color-utility-orange-600)",
    indigo: "var(--color-utility-indigo-600)",
    pink: "var(--color-utility-pink-600)",
    slate: "var(--color-utility-slate-600)",
    red: "var(--color-utility-red-600)",
    purple: "var(--color-utility-purple-600)",
    green: "var(--color-utility-green-600)",
    amber: "var(--color-utility-amber-600)",
    blue: "var(--color-utility-blue-600)",
    fuchsia: "var(--color-utility-fuchsia-600)",
};

/**
 * A color per cohort the backend can return: one line per selected inwonergroep, or
 * `landelijk`, the single line drawn when no inwonergroep is selected. The keys match the
 * group ids in iv3/definitions.py.
 *
 * No gemeente or referentiegroep here: this page compares size classes and nothing else.
 */
const COHORT_COLORS: Record<string, string> = {
    landelijk: COLORS.slate,

    lt25: COLORS.sky,
    "25tot50": COLORS.indigo,
    "50tot100": COLORS.green,
    gt100: COLORS.purple,
    g4: COLORS.pink,
};

/** The line/bar series for the cohorts the backend actually returned, in its order. */
export function cohortSeries(cohorten: Cohort[]): ChartSeries[] {
    return cohorten.map((cohort) => ({
        key: cohort.key,
        name: cohort.label,
        color: COHORT_COLORS[cohort.key] ?? COLORS.slate,
    }));
}

/** Index charts lay a dashed CBS inflation reference line over the cohorts. */
export function indexSeries(cohorten: Cohort[]): ChartSeries[] {
    return [...cohortSeries(cohorten), { key: "inflatie", name: "Inflatie", color: COLORS.red, dashed: true }];
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

export function verdelingSeries(verdeling?: VerdelingPayload): ChartSeries[] {
    return (verdeling?.series ?? []).map((serie, index) => ({
        key: serie.key,
        name: serie.name,
        color: VERDELING_COLORS[index % VERDELING_COLORS.length],
    }));
}

export const spuksSeries: ChartSeries[] = [{ key: "bedrag", name: "Gemiddeld bedrag SPUKS", color: COLORS.brand }];
