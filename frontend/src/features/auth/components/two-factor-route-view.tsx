import { useState } from "react";
import { Link, getRouteApi, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Lock01, Mail01 } from "@untitledui/icons";
import Logo from "@/assets/icons/logo_venster.svg?react";
import { Button } from "@/components/base/buttons/button";
import { Form } from "@/components/base/form/form";
import { Input } from "@/components/base/input/input";
import { useAuth } from "../context/auth-context";
import { resendTwoFactorCode, verifyTwoFactorCode } from "../api";

// getRouteApi rather than importing Route from the route file, which imports this component.
const routeApi = getRouteApi("/2fa");

export function TwoFactorRouteView() {
    const { intent } = routeApi.useSearch();
    const isSignup = intent === "signup";
    const { setUser } = useAuth();
    const navigate = useNavigate();
    const [code, setCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [resendMessage, setResendMessage] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const user = await verifyTwoFactorCode(code.trim());
            setUser(user);
            navigate({ to: "/" });
        } catch (err) {
            setError(err instanceof Error ? err.message : "2FA verificatie mislukt.");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleResend() {
        setError(null);
        setResendMessage(null);
        setIsResending(true);

        try {
            await resendTwoFactorCode();
            setCode("");
            setResendMessage("Er is een nieuwe code verzonden.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Kon geen nieuwe code maken.");
        } finally {
            setIsResending(false);
        }
    }

    return (
        <main id="main-content" tabIndex={-1} className="min-h-screen bg-primary px-4 py-12 outline-none sm:bg-secondary md:px-8 md:pt-24">
            <div className="flex w-full flex-col gap-6 bg-primary sm:mx-auto sm:max-w-110 sm:rounded-2xl sm:px-10 sm:py-8 sm:shadow-sm">
                <div className="flex flex-col items-center gap-6 text-center">
                    <Link to="/" aria-label="Gemeentefinanciën, naar de startpagina">
                        <Logo aria-hidden="true" className="h-[50px] text-[#133556] dark:text-white" />
                    </Link>
                    <div className="mx-auto flex size-14 items-center justify-center rounded-xl border border-secondary">
                        {isSignup ? <Mail01 aria-hidden="true" className="size-7 text-fg-primary" /> : <Lock01 aria-hidden="true" className="size-7 text-fg-primary" />}
                    </div>
                    <div className="flex flex-col gap-2 md:gap-3">
                        <h1 className="text-xl font-semibold text-primary md:text-display-xs">
                            {isSignup ? "E-mailadres bevestigen" : "Tweestapsverificatie"}
                        </h1>
                        <p className="text-md text-tertiary">
                            {isSignup
                                ? "We hebben een 6-cijferige code naar je e-mailadres gestuurd. Voer die in om je account te activeren."
                                : "Voer je 6-cijferige code in om in te loggen."}
                        </p>
                    </div>
                </div>

                <Form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <Input
                        isRequired
                        label="Veilige code"
                        name="code"
                        placeholder="000000"
                        size="lg"
                        value={code}
                        onChange={(v) => setCode(v)}
                        inputMode="numeric"
                        maxLength={6}
                        autoComplete="one-time-code"
                        aria-describedby={error ? "code-error" : undefined}
                    />

                    {error && <p id="code-error" role="alert" className="text-sm text-error-primary">{error}</p>}
                    {resendMessage && <p role="status" className="text-sm text-secondary">{resendMessage}</p>}

                    <Button type="submit" size="lg" isLoading={isSubmitting} showTextWhileLoading isDisabled={code.trim().length !== 6}>
                        Verifiëren
                    </Button>
                </Form>

                <div className="flex flex-col items-center gap-4">
                    <button type="button" onClick={handleResend} disabled={isResending} className="min-h-6 rounded-sm text-sm text-tertiary underline underline-offset-2 outline-focus-ring hover:text-secondary focus-visible:outline-2 focus-visible:outline-offset-2">
                        {isResending ? "Nieuwe code maken..." : "Geen code? Genereer opnieuw"}
                    </button>

                    <Button size="md" color="link-gray" href={isSignup ? "/signup" : "/login"} iconLeading={ArrowLeft}>
                        {isSignup ? "Terug naar registreren" : "Terug naar inloggen"}
                    </Button>
                </div>
            </div>
        </main>
    );
}
