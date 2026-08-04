import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle } from "@untitledui/icons";
import Logo from "@/assets/icons/logo_venster.svg?react";
import { Button } from "@/components/base/buttons/button";
import { Form } from "@/components/base/form/form";
import { Input } from "@/components/base/input/input";
import { confirmPasswordReset, getPasswordResetTokenDetails } from "../api";

function RequirementItem({ ok, label }: { ok: boolean; label: string }) {
    return (
        <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                ok ? "border-success-primary bg-success-primary text-success-primary" : "border-secondary bg-secondary text-tertiary"
            }`}
        >
            <CheckCircle className={`size-4 ${ok ? "text-fg-success-secondary" : "text-fg-tertiary"}`} />
            {label}
        </div>
    );
}

export function PasswordResetRouteView() {
    const navigate = useNavigate();
    const location = useRouterState({ select: (s) => s.location });
    const token = useMemo(() => new URLSearchParams(location.search).get("token") ?? "", [location.search]);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [tokenError, setTokenError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingToken, setIsLoadingToken] = useState(true);

    useEffect(() => {
        if (!token) {
            setTokenError("Geen geldige resetlink gevonden.");
            setIsLoadingToken(false);
            return;
        }

        getPasswordResetTokenDetails(token)
            .then((data) => {
                setEmail(data.email);
            })
            .catch((err) => {
                setTokenError(err instanceof Error ? err.message : "Ongeldige resetlink.");
            })
            .finally(() => {
                setIsLoadingToken(false);
            });
    }, [token]);

    const checks = {
        hasMinLength: password.length >= 8,
        hasSpecialChar: /[^A-Za-z0-9]/.test(password),
    };

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError("Wachtwoorden komen niet overeen.");
            return;
        }

        setIsSubmitting(true);

        try {
            await confirmPasswordReset(token, password);
            navigate({ to: "/login" });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Kon wachtwoord niet resetten.");
        } finally {
            setIsSubmitting(false);
        }
    }

    const isDisabled = isLoadingToken || !!tokenError;

    return (
        <section className="min-h-screen bg-primary px-4 py-12 sm:bg-secondary md:px-8 md:pt-24">
            <div className="flex w-full flex-col gap-6 bg-primary sm:mx-auto sm:max-w-110 sm:rounded-2xl sm:px-10 sm:py-8 sm:shadow-sm">
                <div className="flex flex-col items-center gap-6 text-center">
                    <Link to="/">
                        <Logo className="h-[50px] text-[#133556] dark:text-white" />
                    </Link>
                    <div className="flex flex-col gap-2 md:gap-3">
                        <h1 className="text-xl font-semibold text-primary md:text-display-xs">Wachtwoord resetten</h1>
                        <p className="text-md text-tertiary">Kies een nieuw wachtwoord voor je account.</p>
                    </div>
                </div>

                {tokenError && <p className="text-center text-sm text-error-primary">{tokenError}</p>}

                {!isDisabled && (
                    <Form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <Input label="E-mailadres" type="email" value={email} size="lg" isDisabled />

                        <Input
                            isRequired
                            label="Nieuw wachtwoord"
                            type="password"
                            size="lg"
                            placeholder="••••••••••••"
                            value={password}
                            onChange={(v) => setPassword(v)}
                        />

                        <Input
                            isRequired
                            label="Bevestig wachtwoord"
                            type="password"
                            size="lg"
                            placeholder="••••••••••••"
                            value={confirmPassword}
                            onChange={(v) => setConfirmPassword(v)}
                        />

                        <div className="grid grid-cols-2 gap-2">
                            <RequirementItem ok={checks.hasMinLength} label="Minimaal 8 karakters" />
                            <RequirementItem ok={checks.hasSpecialChar} label="Minimaal 1 speciaal teken" />
                        </div>

                        {error && <p className="text-sm text-error-primary">{error}</p>}

                        <Button type="submit" size="lg" isLoading={isSubmitting} showTextWhileLoading>
                            Wachtwoord resetten
                        </Button>
                    </Form>
                )}

                <div className="flex justify-center text-center">
                    <Button size="md" color="link-gray" href="/login" iconLeading={ArrowLeft}>
                        Terug naar inloggen
                    </Button>
                </div>
            </div>
        </section>
    );
}
