import type { Measure, MeasuresResponse } from "./types";

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
        const data = await response.json().catch(() => ({}));
        const errors = data.expression;
        if (Array.isArray(errors)) {
            throw new Error(errors.join("; "));
        }
        throw new Error(data.detail || "Opslaan mislukt");
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
