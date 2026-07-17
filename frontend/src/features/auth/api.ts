export interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role_code?: string;
    avatar_url?: string;
}

export async function login(email: string, password: string): Promise<User> {
    const response = await fetch("/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Inloggen mislukt");
    }

    return response.json();
}

export async function logout(): Promise<void> {
    await fetch("/api/auth/logout/", {
        method: "POST",
        credentials: "include",
    });
}

export async function me(): Promise<User> {
    const response = await fetch("/api/auth/me/", {
        credentials: "include",
    });

    if (!response.ok) {
        throw new Error("Niet ingelogd");
    }

    return response.json();
}

export async function signup(name: string, email: string, password: string): Promise<User> {
    const response = await fetch("/api/auth/signup/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Registratie mislukt");
    }

    return response.json();
}

export async function requestPasswordReset(email: string): Promise<void> {
    const response = await fetch("/api/auth/password-reset/request/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Verzoek mislukt");
    }
}
