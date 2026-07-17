export interface Cohort {
    /** "gemeente" | "referentie" | "landelijk" — also the dataKey of the series. */
    key: string;
    label: string;
}

/** One year on a line chart: a cohort key per line, plus `inflatie` on the index charts. */
export interface LijnRow {
    name: string;
    [key: string]: string | number | null;
}

export interface VerdelingPayload {
    /** Labels come from the backend, where they sit next to the IV3 codes they describe. */
    series: { key: string; name: string }[];
    data: Record<string, string | number | null>[];
}

export interface GemeentelijkeStand {
    jaar: number | null;
    verslagsoort?: string;
    /** Only the cohorts that have something in them: landelijk always, the rest on selection. */
    cohorten: Cohort[];
    lijnen: Record<string, LijnRow[]>;
    verdeling: {
        hoofdcategorie?: VerdelingPayload;
        hoofdtaakveld?: VerdelingPayload;
    };
    spuks: { name: string; bedrag: number | null }[];
}

/**
 * No gemeente or referentiegroep: this page's charts compare inwonergroepen and nothing
 * else, the shape the Power BI report draws them in. Those two sidebar filters still drive
 * the other pages.
 */
export interface GemeentelijkeStandParams {
    jaar?: number | null;
    verslagsoort?: string | null;
    /** Comma-joined inwonergroep ids, as the URL carries them. */
    inwoner?: string | null;
    reserve?: boolean;
    /**
     * Aborts a request the caller has superseded. Does not stop the work — under WSGI the view
     * runs to completion whatever the client does — but it frees the connection and keeps a
     * stale response from resolving over a fresh one.
     */
    signal?: AbortSignal;
}

/**
 * The whole page in one request. It draws fourteen charts off a single filter selection,
 * so an endpoint per chart would mean fourteen round trips on every dropdown change.
 */
export async function fetchGemeentelijkeStand(params: GemeentelijkeStandParams): Promise<GemeentelijkeStand> {
    const query = new URLSearchParams();

    if (params.jaar) query.set("jaar", String(params.jaar));
    if (params.verslagsoort) query.set("verslagsoort", params.verslagsoort);
    if (params.inwoner) query.set("inwoner", params.inwoner);
    if (params.reserve) query.set("reserve", "true");

    const response = await fetch(`/api/iv3/gemeentelijke-stand/?${query}`, { credentials: "include", signal: params.signal });

    if (!response.ok) {
        throw new Error("Gegevens konden niet worden geladen");
    }

    return response.json();
}
