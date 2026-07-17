import type { ChartSeries } from "@/components/charts/chart-card";
import type { DonutSlice } from "@/components/charts/donut-chart";
import type { Cohort, Lasten, LastenTaakveld, VerdelingZijde } from "../api";

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
    gray: "var(--color-utility-gray-600)",
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

// ── Slice colors ─────────────────────────────────────────────────────────────

// The slices are keyed by whatever code the page splits by — hoofdtaakvelden on the overview,
// taakvelden on a detail page — and the labels come from the backend (they live in
// iv3/definitions.py and the Iv3Taakveld table, next to the codes they describe). Only the
// colors are here.
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
    COLORS.gray,
];

const color = (index: number) => SLICE_COLORS[index % SLICE_COLORS.length];

type Verdeling = NonNullable<Lasten["verdeling"]>;
type Categorie = NonNullable<Lasten["categorie"]>;

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

/** The kostensoort bar's stack, coloured off the same cycle as the donut. */
export function categorieSeries(categorie?: Categorie | null): ChartSeries[] {
    return (categorie?.series ?? []).map((serie, index) => ({
        key: serie.key,
        name: serie.name,
        color: color(index),
    }));
}

/** Euro per inhabitant, whole euros — the cents are noise at this scale. */
const euro = (bedrag: number | null) =>
    bedrag === null ? "—" : `€ ${Math.round(bedrag).toLocaleString("nl-NL")}`;

// ── Per page ─────────────────────────────────────────────────────────────────

interface LastenPagina {
    /** Names the dimension the donut actually splits by, which differs on the overview. */
    donutTitle: string;
    uitlegParagraphs: string[];
    /** The referentiegroep ranking is one bar per gemeente — a single series, no stack. */
    referentiegroepSeries: ChartSeries[];
}

const bar = (name: string): ChartSeries[] => [{ key: "waarde", name, color: COLORS.brand }];

const detailBar = bar("Lasten per inwoner");
const detailTitle = "Lasten per inwoner per taakveld";

export const LASTEN_PAGINAS: Record<LastenTaakveld, LastenPagina> = {
    alle: {
        donutTitle: "Lasten per inwoner per hoofdtaakveld",
        uitlegParagraphs: [
            "Hier zie je een overzicht van de lasten van jouw gemeente en de gekozen referentiegroep.",
            "Via de knoppen in het menu kun je navigeren naar detailpagina's over lasten per hoofdtaakveld.",
        ],
        referentiegroepSeries: bar("Lasten per inwoner"),
    },
    "0": {
        donutTitle: detailTitle,
        uitlegParagraphs: [
            "Op dit taakveld worden de lasten van het gemeentebestuur, burgerzaken en de bedrijfsvoering (overhead) verantwoord.",
            "Overhead vormt doorgaans het grootste deel van dit taakveld en omvat onder andere ICT, huisvesting en ondersteunende diensten.",
        ],
        referentiegroepSeries: detailBar,
    },
    "1": {
        donutTitle: detailTitle,
        uitlegParagraphs: [
            "Op dit kleine taakveld worden lasten verantwoord die gerelateerd zijn aan criminaliteit en de preventie daarvan in de gemeente. Ook de kosten voor de brandweer vallen onder dit taakveld, net als bijvoorbeeld het tegengaan van radicalisatie.",
        ],
        referentiegroepSeries: detailBar,
    },
    "2": {
        donutTitle: detailTitle,
        uitlegParagraphs: [
            "Op dit taakveld worden de lasten voor de aanleg en het onderhoud van wegen, straten, pleinen en openbare verlichting verantwoord.",
            "Ook parkeren, openbaar vervoer en waterwegen vallen onder dit taakveld.",
        ],
        referentiegroepSeries: detailBar,
    },
    "3": {
        donutTitle: detailTitle,
        uitlegParagraphs: [
            "Op dit taakveld worden de lasten voor economische ontwikkeling, bedrijventerreinen en de promotie van de gemeente verantwoord.",
            "Het gaat vaak om een relatief klein taakveld, waarbij de baten uit grondexploitatie deels tegenover de lasten staan.",
        ],
        referentiegroepSeries: detailBar,
    },
    "4": {
        donutTitle: detailTitle,
        uitlegParagraphs: [
            "De bekostiging van onderwijs gaat primair via het Ministerie van Onderwijs, Cultuur en Wetenschap direct naar de schoolbesturen. De gemeenten zijn echter wel verantwoordelijk voor de onderwijshuisvesting voor openbaar en bijzonder onderwijs.",
            "Daarnaast voeren gemeenten onderwijsbeleid en verzorgen zij bijvoorbeeld het leerlingenvervoer.",
        ],
        referentiegroepSeries: detailBar,
    },
    "5": {
        donutTitle: detailTitle,
        uitlegParagraphs: [
            "Op dit taakveld worden uitgaven geboekt die te maken hebben met een breed scala aan voorzieningen. Variërend van sportzalen (5.2), tot musea (5.4) en van openbaar groen (5.7) tot de lokale media (5.6). Een breed taakveld dus, maar wel met allemaal leuke, belangrijke zaken die de leefbaarheid van de gemeente vergroten.",
        ],
        referentiegroepSeries: detailBar,
    },
    "6": {
        donutTitle: detailTitle,
        uitlegParagraphs: [
            "Sinds de decentralisaties in het sociaal domein (1 januari 2015) zijn de gemeenten verantwoordelijk voor de WMO & Jeugdzorg. Maar naast de taken en verantwoordelijkheden die uit deze twee wetten voortvloeien, speelt de gemeente ook nog een belangrijke rol als het gaat om inkomensregelingen en participatie.",
        ],
        referentiegroepSeries: detailBar,
    },
    "7": {
        donutTitle: detailTitle,
        uitlegParagraphs: [
            "Op dit taakveld worden de lasten voor volksgezondheid, riolering, afvalinzameling en milieubeheer verantwoord.",
            "Riolering en afval worden grotendeels gedekt door de riool- en afvalstoffenheffing, die als baten op het taakveld Lokale heffingen terugkomen.",
        ],
        referentiegroepSeries: detailBar,
    },
    "8": {
        donutTitle: detailTitle,
        uitlegParagraphs: [
            "Met actief, of faciliterend, grondbeleid drukt de gemeente duidelijk haar stempel op de inrichting van de publieke ruimte. Zo wordt via bestemmingsplannen bepaald welke grond voor welk gebruik geschikt is en worden grondexploitaties gebruikt om stukken weiland in te richten tot woonwijk of bedrijventerrein.",
        ],
        referentiegroepSeries: detailBar,
    },
};
