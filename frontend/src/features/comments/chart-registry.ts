/**
 * Reads a `chart_id` back into the chart it was written on.
 *
 * A comment is stored against a free-form string the page view types itself — `"<pagina>:<titel>"`,
 * and on Lasten and Baten `"<pagina>:<titel>:<code>"`, where the code is the taakveld or bron the
 * page fetches (see LastenPageView / BatenPageView). The backend never sees more than that string,
 * so this module is the only place that knows which route a stored comment came from. Keep it in
 * step with the chart ids the page views build.
 */

/** Every route a comment can point back to — the literals TanStack Router's `Link` accepts. */
export type ChartRoute =
    | "/trends"
    | "/benchmark"
    | "/managementoverzicht"
    | "/begroting"
    | "/lasten"
    | "/lasten/bestuur-en-ondersteuning"
    | "/lasten/veiligheid"
    | "/lasten/verkeer"
    | "/lasten/economie"
    | "/lasten/onderwijs"
    | "/lasten/sport-cultuur-en-recreatie"
    | "/lasten/sociaal-domein"
    | "/lasten/volksgezondheid-en-milieu"
    | "/lasten/volkshuisvesting"
    | "/baten"
    | "/baten/overige-baten-rijk"
    | "/baten/lokale-heffingen"
    | "/baten/overige-inkomsten";

interface Bestemming {
    to: ChartRoute;
    label: string;
}

/** The hoofdtaakveld codes LastenPageView is given, and the page each one is drawn on. */
const LASTEN: Record<string, Bestemming> = {
    alle: { to: "/lasten", label: "Alle taakvelden" },
    "0": { to: "/lasten/bestuur-en-ondersteuning", label: "Bestuur en ondersteuning" },
    "1": { to: "/lasten/veiligheid", label: "Veiligheid" },
    "2": { to: "/lasten/verkeer", label: "Verkeer" },
    "3": { to: "/lasten/economie", label: "Economie" },
    "4": { to: "/lasten/onderwijs", label: "Onderwijs" },
    "5": { to: "/lasten/sport-cultuur-en-recreatie", label: "Sport, cultuur en recreatie" },
    "6": { to: "/lasten/sociaal-domein", label: "Sociaal domein" },
    "7": { to: "/lasten/volksgezondheid-en-milieu", label: "Volksgezondheid en milieu" },
    "8": { to: "/lasten/volkshuisvesting", label: "Volkshuisvesting" },
};

/** The bronnen BatenPageView is given. */
const BATEN: Record<string, Bestemming> = {
    alle: { to: "/baten", label: "Alle inkomstenbronnen" },
    rijk: { to: "/baten/overige-baten-rijk", label: "Overige baten rijk" },
    heffingen: { to: "/baten/lokale-heffingen", label: "Lokale heffingen" },
    overig: { to: "/baten/overige-inkomsten", label: "Overige inkomsten" },
};

/** The pages whose chart ids carry nothing but a title. */
const ENKELVOUDIG: Record<string, Bestemming> = {
    trends: { to: "/trends", label: "Trends" },
    benchmark: { to: "/benchmark", label: "Benchmark" },
    managementoverzicht: { to: "/managementoverzicht", label: "Managementoverzicht" },
    // The three Begroting pages draw the same seven cards under the same titles
    // (begrotingPagina), so a "begroting:"-comment belongs to all three at once. The overview
    // is where it is sent back to.
    begroting: { to: "/begroting", label: "Begroting" },
};

export interface ChartBeschrijving {
    /** Where the chart lives, e.g. "Lasten · Economie". */
    pageLabel: string;
    /** The chart's own heading, as it reads on the card. */
    chartTitle: string;
    /** The route to navigate to, or null when the id no longer maps to a page. */
    to: ChartRoute | null;
    /** The element id of the card on that page — the URL hash that scrolls it into view. */
    anchor: string;
}

/**
 * The element id a chart card carries, so a link can scroll straight to it. Derived from the
 * chart id rather than stored, because the id is all a comment has.
 */
export function chartAnchorId(chartId: string): string {
    return `chart-${chartId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

/**
 * Splits a chart id into the page it was written on and the chart it belongs to.
 *
 * A renamed chart title or a retired page leaves comments behind pointing at nothing; those come
 * back with `to: null` and the raw id as their title, so the overview can still show them.
 */
export function describeChartId(chartId: string): ChartBeschrijving {
    const anchor = chartAnchorId(chartId);
    const onbekend: ChartBeschrijving = { pageLabel: "Onbekende pagina", chartTitle: chartId, to: null, anchor };

    const delen = chartId.split(":");
    if (delen.length < 2) return onbekend;

    const [prefix, ...rest] = delen;

    if (prefix === "lasten" || prefix === "baten") {
        // "lasten:Referentiegroep:3" — the code is last, so a title with a colon in it survives.
        if (rest.length < 2) return onbekend;
        const code = rest[rest.length - 1];
        const bestemming = (prefix === "lasten" ? LASTEN : BATEN)[code];
        if (!bestemming) return onbekend;
        return {
            pageLabel: `${prefix === "lasten" ? "Lasten" : "Baten"} · ${bestemming.label}`,
            chartTitle: rest.slice(0, -1).join(":"),
            to: bestemming.to,
            anchor,
        };
    }

    const bestemming = ENKELVOUDIG[prefix];
    if (!bestemming) return onbekend;

    return { pageLabel: bestemming.label, chartTitle: rest.join(":"), to: bestemming.to, anchor };
}
