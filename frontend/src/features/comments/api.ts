export interface ChartComment {
    id: number;
    chart_id: string;
    text: string;
    created_at: string;
    updated_at: string;
}

export async function fetchComments(chartIds: string[]): Promise<ChartComment[]> {
    if (chartIds.length === 0) return [];
    const query = chartIds.map((id) => encodeURIComponent(id)).join(",");
    const response = await fetch(`/api/comments/?charts=${query}`, { credentials: "include" });
    if (!response.ok) return [];
    return response.json();
}

/**
 * Every comment the user has written, most recently edited first.
 *
 * Unlike `fetchComments` this one throws: a chart card can do without its comment, but the
 * overview that is nothing but comments has to be able to say that it failed.
 */
export async function fetchAllComments(): Promise<ChartComment[]> {
    const response = await fetch("/api/comments/", { credentials: "include" });
    if (!response.ok) throw new Error("Notities ophalen mislukt");
    return response.json();
}

export async function saveComment(chartId: string, text: string): Promise<ChartComment> {
    const response = await fetch(`/api/comments/${encodeURIComponent(chartId)}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
    });
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Opslaan mislukt");
    }
    return response.json();
}

export async function deleteComment(chartId: string): Promise<void> {
    const response = await fetch(`/api/comments/${encodeURIComponent(chartId)}/`, {
        method: "DELETE",
        credentials: "include",
    });
    if (!response.ok && response.status !== 404) {
        throw new Error("Verwijderen mislukt");
    }
}
