/**
 * Which Lasten page to fetch: the overview, or one hoofdtaakveld — the backend's `taakveld`,
 * see iv3/queries.py. The codes are the CBS hoofdtaakvelden, which is why they are digits.
 */
export type LastenTaakveld = "alle" | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";

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

/** One bar: a gemeente in the referentiegroep and its lasten per inwoner. */
export interface ReferentiegroepRow {
    name: string;
    waarde: number | null;
    [key: string]: string | number | null;
}

/** One side of the donut pair. */
export interface VerdelingZijde {
    label: string;
    /** The page's lasten per inwoner across the whole cohort — the centre of the donut. */
    totaal: number | null;
    /** Keyed by the codes in `verdeling.series`: hoofdtaakvelden, or taakvelden on a detail page. */
    waarden: Record<string, number | null>;
}

/** A stacked bar per cohort, keyed by the codes in its own `series`. */
export interface CategorieRow {
    /** The cohort this bar is, so it can be dropped without matching on its label. */
    key: string;
    name: string;
    [key: string]: string | number | null;
}

export interface Lasten {
    jaar: number | null;
    verslagsoort?: string;
    taakveld?: LastenTaakveld;
    cohorten: Cohort[];
    trend: TrendRow[];
    /** One row per gemeente in the referentiegroep, heaviest first. */
    referentiegroep: ReferentiegroepRow[];
    /** Labels come from the backend, where they sit next to the codes they describe. */
    verdeling: {
        series: { key: string; name: string }[];
        links: VerdelingZijde;
        rechts: VerdelingZijde;
    } | null;
    /** The same lasten by kostensoort — one row per cohort, stacked by hoofdcategorie. */
    categorie: {
        series: { key: string; name: string }[];
        data: CategorieRow[];
    } | null;
}

export interface LastenParams {
    taakveld: LastenTaakveld;
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

/** One page in one request — five charts off a single filter selection. */
export async function fetchLasten(params: LastenParams): Promise<Lasten> {
    const query = new URLSearchParams({ taakveld: params.taakveld });

    if (params.jaar) query.set("jaar", String(params.jaar));
    if (params.verslagsoort) query.set("verslagsoort", params.verslagsoort);
    if (params.gemeente) query.set("gemeente", params.gemeente);
    if (params.referentie) query.set("referentie", params.referentie);
    if (params.reserve) query.set("reserve", "true");

    const response = await fetch(`/api/iv3/lasten/?${query}`, { credentials: "include", signal: params.signal });

    if (!response.ok) {
        throw new Error("Gegevens konden niet worden geladen");
    }

    return response.json();
}
