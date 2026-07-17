import { type ChartSeries, type ChartType, formatValue, type ValueFormat } from "@/components/charts/chart-card";
import type { HighlightCardData } from "@/components/charts/highlight-card";
import type { Cohort, LijnPunt, Managementoverzicht } from "../api";

// -- Colors (Untitled UI utility tokens) --

const COLORS = {
    brand: "var(--color-utility-brand-600)",
    sky: "var(--color-utility-sky-600)",
};

/** Your organisation against the group you chose to read it against. */
const COHORT_COLORS: Record<string, string> = {
    gemeente: COLORS.brand,
    referentie: COLORS.sky,
};

/** The reeksen the backend actually filled, in the order it returned them. */
function cohortSeries(cohorten: Cohort[]): ChartSeries[] {
    return cohorten.map((cohort) => ({
        key: cohort.key,
        name: cohort.label,
        color: COHORT_COLORS[cohort.key] ?? COLORS.brand,
    }));
}

/**
 * The two figures above each chart: the latest year, and how far it moved from the year before.
 *
 * Computed here rather than in the backend, which hands back numbers and never formatted text:
 * HighlightCardData is pre-formatted strings all the way down, the format differs per card (euros
 * on five, a percentage on the solvabiliteit), and `formatValue` — the thing that knows how a
 * figure reads — lives next to the charts it is drawn for. The data half is just the last two
 * points of a line the payload already carries whole.
 *
 * `trend` is the direction of movement and nothing more: rose is green, fell is red, on all six
 * cards. It is not a judgement — a gemeente whose belastingdruk rose is not thereby doing badly —
 * and one rule everywhere is the only one that does not quietly imply otherwise.
 *
 * A cohort with no figure in the latest year is left off entirely; ChartCardWithDetails draws no
 * highlights at all for an empty list. A cohort with no *previous* figure keeps its value and
 * loses only the arrow, rather than being given a green one it has not earned.
 */
function highlights(rows: LijnPunt[], cohorten: Cohort[], valueFormat: ValueFormat): HighlightCardData[] {
    const laatste = rows.at(-1);
    const vorige = rows.at(-2);

    return cohorten.flatMap((cohort) => {
        const waarde = laatste?.[cohort.key];
        if (typeof waarde !== "number") return [];

        const eerder = vorige?.[cohort.key];
        // Against the absolute previous figure: a negative one would otherwise flip the sign
        // against the direction the line visibly moved.
        const verschil =
            typeof eerder === "number" && eerder !== 0 ? ((waarde - eerder) / Math.abs(eerder)) * 100 : null;

        return [
            {
                label: cohort.label,
                value: formatValue(waarde, valueFormat),
                change:
                    verschil === null
                        ? undefined
                        : `${Math.abs(verschil).toLocaleString("nl-NL", { maximumFractionDigits: 1 })}%`,
                trend: verschil === null ? undefined : verschil >= 0 ? "positive" : "negative",
            },
        ];
    });
}

/**
 * Whole euros, on the axis and in the tooltip alike.
 *
 * A cent of a euro-per-inwoner figure is noise — these are a gemeente's whole payroll divided by
 * its population — and the page was drawn to read "€ 3.116" rather than "€ 3.116,42". Rounded
 * here rather than in `formatValue`, whose "euro" branch the Begroting, Lasten and Baten pages
 * all read through: this is a decision about this page, not about how the dashboard prints euros.
 *
 * The figures are rounded before the highlights are derived from them, so a card's change
 * percentage is the one its own two numbers actually imply.
 */
function heleEuros(rows: LijnPunt[]): LijnPunt[] {
    return rows.map((punt) =>
        Object.fromEntries(
            Object.entries(punt).map(([key, waarde]) => [key, typeof waarde === "number" ? Math.round(waarde) : waarde]),
        ),
    ) as LijnPunt[];
}

export interface ManagementKaart {
    title: string;
    description: string;
    source: { label: string; value: string }[];
    highlights: HighlightCardData[];
    data: Record<string, unknown>[];
    series: ChartSeries[];
    chartType: ChartType;
    valueFormat: ValueFormat;
}

export interface ManagementPagina {
    begroting: ManagementKaart[];
    salarislasten: ManagementKaart[];
}

function kaart(
    title: string,
    description: string,
    source: { label: string; value: string }[],
    rows: LijnPunt[],
    cohorten: Cohort[],
    valueFormat: ValueFormat = "euro",
): ManagementKaart {
    // The solvabiliteit keeps its decimals: it is a ratio between 0 and 100, where a tenth is a
    // real difference between two gemeenten rather than a rounding artefact.
    const punten = valueFormat === "euro" ? heleEuros(rows) : rows;

    return {
        title,
        description,
        source,
        highlights: highlights(punten, cohorten, valueFormat),
        data: punten,
        series: cohortSeries(cohorten),
        chartType: "area",
        valueFormat,
    };
}

/** The six cards, in the two sections the page draws them under. */
export function managementoverzichtPagina(data: Managementoverzicht | null): ManagementPagina {
    const cohorten = data?.cohorten ?? [];
    const lijnen = data?.lijnen ?? {};

    return {
        begroting: [
            kaart(
                "Wat zijn de uitgaven per inwoner?",
                "Hiernaast zie je de uitgaven per inwoner. Deze worden berekend door de totale lasten te delen door het aantal inwoners op 1 januari van het jaar waar de begroting/jaarrekening betrekking op heeft.",
                [
                    { label: "IV3-dataset", value: "" },
                    { label: "Lasten/baten", value: "Lasten" },
                    { label: "Kostencategorie", value: "Alle" },
                    { label: "Taakveld", value: "Alle" },
                ],
                lijnen.uitgaven ?? [],
                cohorten,
            ),
            kaart(
                "Hoe sterk is de financiële positie?",
                "Om de financiële gezondheid uit te drukken, wordt hier gebruik gemaakt van de solvabiliteitsratio. Deze wordt berekend door het eigen vermogen te delen door het totale vermogen en uit te drukken als percentage. Bij een hoge solvabiliteit is er veel eigen vermogen tegenover vreemd vermogen (de schulden). De kans dat een gemeente haar schulden kan afbetalen is groot. Bij een lagere solvabiliteit, wordt deze kans steeds lager. De balans wordt alleen in de jaarrekening volledig verantwoord; deze grafiek is daarom altijd op de jaarrekening gebaseerd, ook wanneer de begroting is geselecteerd.",
                [
                    { label: "Databank Financiën Gemeenten, Findo", value: "" },
                    { label: "Balanspost: P11 - Eigen vermogen, P - Totaal passiva", value: "" },
                    // Said out loud rather than left to be inferred from a line that stops short
                    // of the others — see Solvabiliteit in api.ts.
                    { label: "Verslagsoort", value: data?.solvabiliteit?.label ?? "Jaarrekening" },
                ],
                data?.solvabiliteit?.data ?? [],
                cohorten,
                "percent",
            ),
            kaart(
                "Hoe hoog is de lokale belastingdruk?",
                "Elke gemeente in Nederland heft een aantal lokale belastingen en heffingen. Denk bijvoorbeeld aan de onroerendezaakbelasting en de afvalstoffenheffing. Daarnaast rekenen gemeenten leges voor bijvoorbeeld het aanvragen van een vergunning. Al deze belastingen, heffingen, leges en andere rechten vallen hiernaast weergegeven, uitgedrukt in euro per inwoner.",
                [
                    { label: "IV3-dataset", value: "" },
                    { label: "Lasten/baten", value: "Baten" },
                    {
                        label: "Kostencategorie: 2.2.1 - Belastingen op producenten, 2.2.2 - Belastingen op huishoudens, 3.7 - Leges en andere rechten",
                        value: "",
                    },
                    { label: "Taakveld", value: "Alle" },
                ],
                lijnen.belastingdruk ?? [],
                cohorten,
            ),
        ],
        salarislasten: [
            kaart(
                "Hoeveel wordt er uitgegeven aan personeel?",
                "Hier ziet u de totale salarislasten (incl. sociale lasten) van het eigen personeel, uitgedrukt in euro per inwoner. Let op: bij gemeenten die veel taken hebben ondergebracht in een samenwerkingsverband en/of hebben uitbesteed, kunnen salarislasten veel lager uitvallen dan bij vergelijkbare gemeenten die deze taken (grotendeels) in eigen beheer hebben.",
                [
                    { label: "IV3-dataset", value: "" },
                    { label: "Lasten/baten", value: "Lasten" },
                    { label: "Kostencategorie: 1.1 - Salarissen en sociale lasten", value: "" },
                    { label: "Taakveld: Alle, behalve 0.4 - Overhead", value: "" },
                ],
                lijnen.salarissen ?? [],
                cohorten,
            ),
            kaart(
                "Hoeveel wordt er uitgegeven aan inhuur?",
                "Hier zie je de totale lasten van het ingeleend personeel, uitgedrukt in euro per inwoner. Onder ingeleend personeel vallen mensen die gedetacheerd zijn vanuit andere overheidsorganisaties, uitzendkrachten en externe adviseurs. Arbeidskosten bij uitbestede werkzaamheden, zoals bij schoonmaak- en onderhoudswerkzaamheden, vallen niet onder ingeleend personeel.",
                [
                    { label: "IV3-dataset", value: "" },
                    { label: "Lasten/baten", value: "Lasten" },
                    { label: "Kostencategorie: 3.5.1 - Ingeleend personeel", value: "" },
                    { label: "Taakveld: Alle, behalve 0.4 - Overhead", value: "" },
                ],
                lijnen.inhuur ?? [],
                cohorten,
            ),
            kaart(
                "Hoe staat het met de overheadkosten?",
                "Hier zie je de totale personele lasten (zowel eigen, als ingeleend personeel) van de overhead. Alle activiteiten behorend tot de overhead zijn beschreven in de 'Notitie overhead' van de commissie BBV.",
                [
                    { label: "IV3-dataset", value: "" },
                    { label: "Lasten/baten", value: "Lasten" },
                    { label: "Kostencategorie: 1.1 Salarissen en sociale lasten, 3.5.1 - Ingeleend personeel", value: "" },
                    { label: "Taakveld: 0.4 - Overhead", value: "" },
                ],
                lijnen.overhead ?? [],
                cohorten,
            ),
        ],
    };
}
