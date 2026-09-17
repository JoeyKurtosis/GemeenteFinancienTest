import type { Measure, MeasuresResponse } from "./types";

/** DRF antwoordt met `{veld: ["melding", ...]}` of `{detail: "melding"}`. Pak de eerste melding. */
async function readError(response: Response, fallback: string): Promise<Error> {
    const data = await response.json().catch(() => ({}));
    if (typeof data?.detail === "string") return new Error(data.detail);

    for (const value of Object.values(data ?? {})) {
        if (Array.isArray(value) && value.length) return new Error(value.join("; "));
        if (typeof value === "string") return new Error(value);
    }
    return new Error(fallback);
}

export async function fetchMeasures(): Promise<MeasuresResponse> {
    const response = await fetch("/api/iv3/measures/", {
        credentials: "include",
    });
    if (!response.ok) throw new Error("Formules ophalen mislukt");
    return response.json();
}

export async function updateMeasure(
    key: string,
    payload: Partial<Measure>,
): Promise<Measure> {
    const response = await fetch(`/api/iv3/measures/${key}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw await readError(response, "Opslaan mislukt");
    }
    return response.json();
}

export async function resetMeasures(): Promise<void> {
    const response = await fetch("/api/iv3/measures/reset/", {
        method: "POST",
        credentials: "include",
    });
    if (!response.ok) throw new Error("Herstellen mislukt");
}
