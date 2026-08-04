import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Lock01 } from "@untitledui/icons";
import Logo from "@/assets/icons/logo_venster.svg?react";
import { Button } from "@/components/base/buttons/button";
import { Form } from "@/components/base/form/form";
import { Input } from "@/components/base/input/input";
import { useAuth } from "../context/auth-context";
import { resendTwoFactorCode, verifyTwoFactorCode } from "../api";

export function TwoFactorRouteView() {
    const { setUser } = useAuth();
    const navigate = useNavigate();
    const [code, setCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResending, setIsResending] = useState(false);

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
        setIsResending(true);

        try {
            await resendTwoFactorCode();
            setCode("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Kon geen nieuwe code maken.");
        } finally {
            setIsResending(false);
        }
    }

    return (
        <section className="min-h-screen bg-primary px-4 py-12 sm:bg-secondary md:px-8 md:pt-24">
            <div className="flex w-full flex-col gap-6 bg-primary sm:mx-auto sm:max-w-110 sm:rounded-2xl sm:px-10 sm:py-8 sm:shadow-sm">
                <div className="flex flex-col items-center gap-6 text-center">
                    <Link to="/">
                        <Logo className="h-[50px] text-[#133556] dark:text-white" />
                    </Link>
                    <div className="mx-auto flex size-14 items-center justify-center rounded-xl border border-secondary">
                        <Lock01 className="size-7 text-fg-primary" />
                    </div>
                    <div className="flex flex-col gap-2 md:gap-3">
                        <h1 className="text-xl font-semibold text-primary md:text-display-xs">Two-factor Authenticatie</h1>
                        <p className="text-md text-tertiary">Voer je 6-cijferige code in om in te loggen.</p>
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
                    />

                    {error && <p className="text-sm text-error-primary">{error}</p>}

                    <Button type="submit" size="lg" isLoading={isSubmitting} showTextWhileLoading isDisabled={code.trim().length !== 6}>
                        Verifiëren
                    </Button>
                </Form>

                <div className="flex flex-col items-center gap-4">
                    <button type="button" onClick={handleResend} disabled={isResending} className="text-sm text-tertiary hover:text-secondary">
                        {isResending ? "Nieuwe code maken..." : "Geen code? Genereer opnieuw"}
                    </button>

                    <Button size="md" color="link-gray" href="/login" iconLeading={ArrowLeft}>
                        Terug naar inloggen
                    </Button>
                </div>
            </div>
        </section>
    );
}
