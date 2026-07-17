/** Which of the four Baten pages to fetch — the backend's `bron`, see iv3/queries.py. */
export type BatenBron = "alle" | "rijk" | "heffingen" | "overig";

export interface Cohort {
    /** "gemeente" | "referentie" | "landelijk" — also the dataKey of the series. */
    key: string;
    label: string;
}

/** One year on the trend line: a cohort key per line. */
export interface TrendRow {
    name: string;
    [key: string]: string | number | null;
}

/** One bar: a gemeente in the referentiegroep and its baten per inwoner. */
export interface ReferentiegroepRow {
    name: string;
    waarde: number | null;
    [key: string]: string | number | null;
}

/** One side of the donut pair. */
export interface VerdelingZijde {
    label: string;
    /** The page's figure per inwoner across the whole cohort — the centre of the donut. */
    totaal: number | null;
    /** Keyed by the codes in `verdeling.series`; what those are depends on the bron. */
    waarden: Record<string, number | null>;
}

export interface Baten {
    jaar: number | null;
    verslagsoort?: string;
    bron?: BatenBron;
    cohorten: Cohort[];
    trend: TrendRow[];
    /** One row per gemeente in the referentiegroep, heaviest first. */
    referentiegroep: ReferentiegroepRow[];
    verdeling: {
        /** Labels come from the backend, where they sit next to the codes they describe. */
        series: { key: string; name: string }[];
        links: VerdelingZijde;
        rechts: VerdelingZijde;
    } | null;
}

export interface BatenParams {
    bron: BatenBron;
    jaar?: number | null;
    verslagsoort?: string | null;
    gemeente?: string | null;
    /** Comma-joined gemeente codes, as the URL carries them. */
    referentie?: string | null;
    reserve?: boolean;
    /**
     * Aborts a request the caller has superseded. Does not stop the work — under WSGI the view
     * runs to completion whatever the client does — but it frees the connection and keeps a
     * stale response from resolving over a fresh one.
     */
    signal?: AbortSignal;
}

/** One page in one request — four charts off a single filter selection. */
export async function fetchBaten(params: BatenParams): Promise<Baten> {
    const query = new URLSearchParams({ bron: params.bron });

    if (params.jaar) query.set("jaar", String(params.jaar));
    if (params.verslagsoort) query.set("verslagsoort", params.verslagsoort);
    if (params.gemeente) query.set("gemeente", params.gemeente);
    if (params.referentie) query.set("referentie", params.referentie);
    if (params.reserve) query.set("reserve", "true");

    const response = await fetch(`/api/iv3/baten/?${query}`, { credentials: "include", signal: params.signal });

    if (!response.ok) {
        throw new Error("Gegevens konden niet worden geladen");
    }

    return response.json();
}
