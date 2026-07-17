export interface Cohort {
    /** "gemeente" | "referentie" | "landelijk" — also the dataKey of the series. */
    key: string;
    label: string;
}

/** A stacked bar: personele lasten per inwoner, split into the two categorieën. */
export interface PersoneelRow {
    name: string;
    salarissen: number | null;
    inhuur: number | null;
    [key: string]: string | number | null;
}

/** One year on the trend line: a cohort key per line. */
export interface TrendRow {
    name: string;
    [key: string]: string | number | null;
}

/** One side of the donut pair. */
export interface TaakveldZijde {
    label: string;
    /** Personele lasten per inwoner across the whole cohort — the centre of the donut. */
    totaal: number | null;
    /** Per hoofdtaakveld code ("0".."8"). */
    waarden: Record<string, number | null>;
}

export interface Benchmark {
    jaar: number | null;
    verslagsoort?: string;
    cohorten: Cohort[];
    trend: TrendRow[];
    /** One row per cohort. */
    categorie: PersoneelRow[];
    /** One row per gemeente in the referentiegroep, heaviest first. */
    referentiegroep: PersoneelRow[];
    taakvelden: {
        /** Labels come from the backend, where they sit next to the codes they describe. */
        series: { key: string; name: string }[];
        links: TaakveldZijde;
        rechts: TaakveldZijde;
    } | null;
}

export interface BenchmarkParams {
    jaar?: number | null;
    verslagsoort?: string | null;
    gemeente?: string | null;
    /** Comma-joined gemeente codes, as the URL carries them. */
    referentie?: string | null;
    /**
     * Aborts a request the caller has superseded. Does not stop the work — under WSGI the view
     * runs to completion whatever the client does — but it frees the connection and keeps a
     * stale response from resolving over a fresh one.
     */
    signal?: AbortSignal;
}

/** The whole page in one request — four charts off a single filter selection. */
export async function fetchBenchmark(params: BenchmarkParams): Promise<Benchmark> {
    const query = new URLSearchParams();

    if (params.jaar) query.set("jaar", String(params.jaar));
    if (params.verslagsoort) query.set("verslagsoort", params.verslagsoort);
    if (params.gemeente) query.set("gemeente", params.gemeente);
    if (params.referentie) query.set("referentie", params.referentie);

    const response = await fetch(`/api/iv3/benchmark/?${query}`, { credentials: "include", signal: params.signal });

    if (!response.ok) {
        throw new Error("Gegevens konden niet worden geladen");
    }

    return response.json();
}
