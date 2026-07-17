export interface Cohort {
    /** "gemeente" or "referentie" — also the dataKey each reeks is drawn under. */
    key: string;
    label: string;
}

/** One year on a line: a figure per cohort, null where the cohort has none. */
export interface LijnPunt {
    name: string;
    [key: string]: string | number | null;
}

/**
 * The solvabiliteit, apart from the other five.
 *
 * It is a percentage rather than euros, it is read off the balance sheet rather than the
 * exploitatie, and it is always drawn from the Jaarrekening whatever verslagsoort is selected —
 * the Begroting's balans is filed too incompletely to divide by. `verslagsoort` is the newest
 * Jaarrekening the line actually reaches, so the card can print which report it is answering
 * for; null when the selected years hold no Jaarrekening at all.
 */
export interface Solvabiliteit {
    verslagsoort: string | null;
    label: string;
    data: LijnPunt[];
}

export interface Managementoverzicht {
    jaar: number | null;
    verslagsoort?: string;
    cohorten: Cohort[];
    lijnen: {
        uitgaven?: LijnPunt[];
        belastingdruk?: LijnPunt[];
        salarissen?: LijnPunt[];
        inhuur?: LijnPunt[];
        overhead?: LijnPunt[];
    };
    solvabiliteit: Solvabiliteit | null;
}

export interface ManagementoverzichtParams {
    jaar?: number | null;
    verslagsoort?: string | null;
    gemeente?: string | null;
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
export async function fetchManagementoverzicht(params: ManagementoverzichtParams): Promise<Managementoverzicht> {
    const query = new URLSearchParams();
    if (params.jaar) query.set("jaar", String(params.jaar));
    if (params.verslagsoort) query.set("verslagsoort", params.verslagsoort);
    if (params.gemeente) query.set("gemeente", params.gemeente);
    if (params.referentie) query.set("referentie", params.referentie);
    if (params.reserve) query.set("reserve", "true");

    const response = await fetch(`/api/iv3/managementoverzicht/?${query}`, { credentials: "include", signal: params.signal });
    if (!response.ok) {
        throw new Error("Gegevens konden niet worden geladen");
    }
    return response.json();
}
