import type { ChartSeries } from "@/components/charts/chart-card";
import type { DonutSlice } from "@/components/charts/donut-chart";
import type { Baten, BatenBron, Cohort, VerdelingZijde } from "../api";

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

// ── Series ───────────────────────────────────────────────────────────────────

/** The cohorts the trend line compares; the backend omits the ones not selected. */
const COHORT_COLORS: Record<string, string> = {
    gemeente: COLORS.brand,
    referentie: COLORS.orange,
    landelijk: COLORS.slate,
};

export function trendSeries(cohorten: Cohort[]): ChartSeries[] {
    // Your gemeente against its referentiegroep, mirroring the Power BI report; the landelijk
    // cohort is dropped here (the backend still sends it, and the donuts fall back to it).
    return cohorten
        .filter((cohort) => cohort.key !== "landelijk")
        .map((cohort) => ({
            key: cohort.key,
            name: cohort.label,
            color: COHORT_COLORS[cohort.key] ?? COLORS.slate,
        }));
}

// ── Donut pair ───────────────────────────────────────────────────────────────

// The slices are keyed by whatever code the page splits by, and the labels come from the
// backend (they live in iv3/definitions.py, next to the codes they describe). Only the colors
// are here.
const SLICE_COLORS = [
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

const color = (index: number) => SLICE_COLORS[index % SLICE_COLORS.length];

type Verdeling = NonNullable<Baten["verdeling"]>;

/** Both donuts share one legend. */
export function verdelingCategories(verdeling?: Verdeling | null) {
    return (verdeling?.series ?? []).map((serie, index) => ({ name: serie.name, color: color(index) }));
}

export function donutSide(verdeling: Verdeling, zijde: VerdelingZijde) {
    const data: DonutSlice[] = verdeling.series.map((serie, index) => ({
        name: serie.name,
        value: zijde.waarden[serie.key] ?? 0,
        color: color(index),
    }));

    return { label: zijde.label, centerValue: euro(zijde.totaal), data };
}

/** Euro per inhabitant, whole euros — the cents are noise at this scale. */
const euro = (bedrag: number | null) =>
    bedrag === null ? "—" : `€ ${Math.round(bedrag).toLocaleString("nl-NL")}`;

// ── Per page ─────────────────────────────────────────────────────────────────

interface BatenPagina {
    /** Names the dimension the donut actually splits by, which differs per page. */
    donutTitle: string;
    uitlegParagraphs: string[];
    /** The referentiegroep ranking is one bar per gemeente — a single series, no stack. */
    referentiegroepSeries: ChartSeries[];
}

const bar = (name: string): ChartSeries[] => [{ key: "waarde", name, color: COLORS.brand }];

export const BATEN_PAGINAS: Record<BatenBron, BatenPagina> = {
    alle: {
        donutTitle: "Baten per inwoner per inkomstenbron",
        uitlegParagraphs: [
            "Hier zie je een overzicht van de baten van jouw gemeente en de gekozen referentiegroep.",
            "Via de knoppen in het menu kun je navigeren naar detailpagina's over baten per inkomstenbron.",
        ],
        referentiegroepSeries: bar("Baten per inwoner"),
    },
    rijk: {
        donutTitle: "Baten per inwoner per taakveld",
        uitlegParagraphs: [
            "Hier zie je een overzicht van de overige baten van het rijk (specifieke uitkeringen, ofwel 'spuks') van jouw gemeente en de gekozen referentiegroep.",
            "Dit betreft doeluitkeringen die het rijk verstrekt voor specifieke taken en daarom buiten de algemene uitkering van het gemeentefonds vallen.",
        ],
        referentiegroepSeries: bar("Overige baten rijk per inwoner"),
    },
    heffingen: {
        donutTitle: "Baten per inwoner per categorie",
        uitlegParagraphs: [
            "Hier zie je een overzicht van de baten uit lokale heffingen van jouw gemeente en de gekozen referentiegroep. Dit omvat verschillende lokale belastingen, maar daarnaast ook inkomsten uit vergunningen en leges.",
        ],
        referentiegroepSeries: bar("Lokale heffingen per inwoner"),
    },
    overig: {
        donutTitle: "Baten per inwoner per hoofdcategorie",
        uitlegParagraphs: [
            "Hier zie je een overzicht van de baten uit overige bronnen van jouw gemeente en de gekozen referentiegroep. Dit omvat bijvoorbeeld bijdragen vanuit reserves en inkomsten uit grond. Daarnaast vallen alle baten, die niet binnen andere hokjes passen, in deze bron.",
        ],
        referentiegroepSeries: bar("Overige inkomsten per inwoner"),
    },
};
