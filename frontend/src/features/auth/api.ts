export interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_admin?: boolean;
    role_code?: string;
    avatar_url?: string;
}

export interface LoginResponse {
    requires_2fa?: boolean;
    detail?: string;
    expires_in_seconds?: number;
}

/** Signup never returns a session — it always answers with a pending code challenge. */
export type SignupResponse = Required<Pick<LoginResponse, "requires_2fa">> & LoginResponse;

export interface PasswordResetTokenDetails {
    email: string;
    token: string;
}

// ── Login & Auth ──

export async function login(email: string, password: string): Promise<User | LoginResponse> {
    const response = await fetch("/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok && response.status !== 202) {
        throw new Error(data.detail || "Inloggen mislukt");
    }

    return data;
}

export async function verifyTwoFactorCode(code: string): Promise<User> {
    const response = await fetch("/api/auth/2fa/verify/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.detail || "2FA verificatie mislukt.");
    }

    return data;
}

export async function resendTwoFactorCode(): Promise<{ detail: string; expires_in_seconds: number }> {
    const response = await fetch("/api/auth/2fa/resend/", {
        method: "POST",
        credentials: "include",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.detail || "Kon 2FA code niet opnieuw versturen.");
    }

    return data;
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

export async function signup(name: string, email: string, password: string): Promise<SignupResponse> {
    const response = await fetch("/api/auth/signup/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.detail || "Registratie mislukt");
    }

    return data;
}

// ── Password Reset ──

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

export async function getPasswordResetTokenDetails(token: string): Promise<PasswordResetTokenDetails> {
    const response = await fetch(`/api/auth/password-reset/${token}/`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.detail || "Reset link is ongeldig.");
    }

    return data;
}

export async function confirmPasswordReset(token: string, password: string): Promise<void> {
    const response = await fetch("/api/auth/password-reset/confirm/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.detail || "Kon wachtwoord niet resetten.");
    }
}

