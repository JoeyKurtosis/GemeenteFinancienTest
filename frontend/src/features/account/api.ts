import type { User } from "@/features/auth";

export interface UpdateProfilePayload {
    first_name?: string;
    last_name?: string;
    email?: string;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
    const response = await fetch("/api/auth/me/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Bijwerken mislukt");
    }

    return response.json();
}

export interface ChangePasswordPayload {
    current_password: string;
    new_password: string;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
    const response = await fetch("/api/auth/password/change/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Wachtwoord wijzigen mislukt");
    }
}
