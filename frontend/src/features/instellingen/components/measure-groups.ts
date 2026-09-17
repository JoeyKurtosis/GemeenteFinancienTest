import type { Measure } from "../types";

/**
 * De `page`-waarden op Measure zijn vrije tekst uit init_measures.py en dekken *niet* de
 * routetitels. "Gemeentelijke Stand" is de /trends-route, die zelf "Trends" heet en de
 * gemeentelijke stand als ondertitel voert — daar niet in trappen bij het aanpassen van
 * deze tabel. De volgorde hieronder is de volgorde waarin de groepen op de pagina staan.
 */
const PAGINA_ROUTES: Array<{ page: string; route: string }> = [
    { page: "Gemeentelijke Stand", route: "/trends" },
    { page: "Baten", route: "/baten" },
    { page: "Begroting", route: "/in-een-oogopslag" },
    { page: "Benchmark", route: "/benchmark" },
    { page: "Managementoverzicht", route: "/in-een-oogopslag" },
];

const ROUTE_PER_PAGINA = new Map(PAGINA_ROUTES.map(({ page, route }) => [page, route]));

/** Formules zonder (herkenbare) pagina belanden hier — zelf toegevoegde formules bijvoorbeeld. */
const OVERIG = "Overig";

export interface MeasureGroup {
    page: string;
    /** Ontbreekt voor de "Overig"-groep: daar valt geen dashboardpagina bij te linken. */
    route?: string;
    measures: Measure[];
}

/** Splitst het komma-gescheiden `page`-veld in losse paginanamen. */
export function paginasVan(measure: Measure): string[] {
    return measure.page
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
}

function matchtZoekterm(measure: Measure, term: string): boolean {
    return [measure.name, measure.key, measure.expression, measure.description].some((veld) => veld.toLowerCase().includes(term));
}

/**
 * Groepeert de formules per dashboardpagina. Een formule die op drie pagina's meetelt komt in
 * alle drie de groepen terug — dat is precies wat zichtbaar moet zijn, en de kaart zelf zegt
 * erbij waar hij nog meer gebruikt wordt.
 *
 * Groepen zonder treffers vallen weg, zodat een zoekopdracht geen lege kopjes achterlaat.
 */
export function groupMeasuresByPage(measures: Measure[], query = ""): MeasureGroup[] {
    const term = query.trim().toLowerCase();
    const gefilterd = term ? measures.filter((m) => matchtZoekterm(m, term)) : measures;

    const groups: MeasureGroup[] = PAGINA_ROUTES.map(({ page, route }) => ({
        page,
        route,
        measures: gefilterd.filter((m) => paginasVan(m).includes(page)),
    }));

    const overig = gefilterd.filter((m) => !paginasVan(m).some((p) => ROUTE_PER_PAGINA.has(p)));
    if (overig.length) {
        groups.push({ page: OVERIG, measures: overig });
    }

    return groups.filter((group) => group.measures.length > 0);
}

/**
 * De overige pagina's waar deze formule ook op meetelt, gezien vanuit `huidigePagina`.
 * Onbekende paginanamen blijven staan: ze zeggen nog steeds iets over de reikwijdte.
 */
export function anderePaginas(measure: Measure, huidigePagina: string): string[] {
    return paginasVan(measure).filter((p) => p !== huidigePagina);
}
