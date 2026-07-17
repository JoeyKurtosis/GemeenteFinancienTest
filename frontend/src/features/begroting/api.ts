export interface Cohort {
    /** "gemeente" | "referentie" | "landelijk" — also the dataKey of the series. */
    key: string;
    label: string;
}

/** One year on the uitgaven line: a cohort key per line. */
export interface LijnRow {
    name: string;
    [key: string]: string | number | null;
}

export interface VerdelingPayload {
    /** Labels come from the backend, where they sit next to the IV3 codes they describe. */
    series: { key: string; name: string }[];
    data: Record<string, string | number | null>[];
}

/** Euros per inhabitant; `null` when the cohort has no inhabitants behind it. */
export interface ResultaatRow {
    key: string;
    label: string;
    inkomsten: number | null;
    uitgaven: number | null;
    resultaat: number | null;
}

export interface Begroting {
    jaar: number | null;
    verslagsoort?: string;
    /**
     * The series on the uitgaven line. On a comparison page these are the two verslagsoorten
     * rather than cohorten, and they can outlive the other charts: the newest years carry a
     * Begroting but no Jaarrekening yet, so the line draws one the snapshot has no row for.
     */
    cohorten: Cohort[];
    resultaat: ResultaatRow[];
    uitgavenPerJaar: LijnRow[];
    inkomsten?: VerdelingPayload | null;
    verdeling: {
        hoofdtaakveld?: VerdelingPayload;
        hoofdcategorie?: VerdelingPayload;
        heffingen?: VerdelingPayload;
        overigeInkomsten?: VerdelingPayload;
    };
}

/**
 * Which slice of the begroting a page shows: your gemeente against its referentiegroep, or
 * begroting against jaarrekening in euros per inhabitant or in absolute amounts. The backend
 * reads this off the query string — see BEGROTING_WEERGAVEN in iv3/queries.py.
 */
export type BegrotingWeergave = "overzicht" | "per-inwoner" | "absolute-bedragen";

export interface BegrotingParams {
    weergave: BegrotingWeergave;
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

/** The whole page in one request, as with the other IV3 pages. */
export async function fetchBegroting(params: BegrotingParams): Promise<Begroting> {
    const query = new URLSearchParams({ weergave: params.weergave });

    if (params.jaar) query.set("jaar", String(params.jaar));
    if (params.verslagsoort) query.set("verslagsoort", params.verslagsoort);
    if (params.gemeente) query.set("gemeente", params.gemeente);
    if (params.referentie) query.set("referentie", params.referentie);
    if (params.reserve) query.set("reserve", "true");

    const response = await fetch(`/api/iv3/begroting/?${query}`, { credentials: "include", signal: params.signal });

    if (!response.ok) {
        throw new Error("Gegevens konden niet worden geladen");
    }

    return response.json();
}
