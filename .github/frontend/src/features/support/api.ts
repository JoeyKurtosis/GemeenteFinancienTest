export interface SupportRequestResponse {
    id: number;
    ticket_number: string;
    name: string;
    email: string;
    subject: string;
    message: string;
}

export async function createSupportRequest(payload: {
    name: string;
    email: string;
    subject: string;
    message: string;
    attachments?: File[];
}): Promise<SupportRequestResponse> {
    const formData = new FormData();
    formData.append("name", payload.name);
    formData.append("email", payload.email);
    formData.append("subject", payload.subject);
    formData.append("message", payload.message);
    payload.attachments?.forEach((f) => formData.append("attachments", f));

    const response = await fetch("/api/support-requests/", {
        method: "POST",
        credentials: "include",
        body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.detail || "Kon supportverzoek niet versturen.");
    }

    return data;
}
