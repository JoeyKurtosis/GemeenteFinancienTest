import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import Logo from "@/assets/icons/logo_venster.svg?react";
import { Button } from "@/components/base/buttons/button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Form } from "@/components/base/form/form";
import { Input } from "@/components/base/input/input";
import { useAuth } from "../context/auth-context";

export function LoginRouteView() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        const data = Object.fromEntries(new FormData(e.currentTarget));

        try {
            await login(data.email as string, data.password as string);
            navigate({ to: "/" });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Inloggen mislukt");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="min-h-screen bg-primary px-4 py-12 sm:bg-secondary md:px-8 md:pt-24">
            <div className="flex w-full flex-col gap-6 bg-primary sm:mx-auto sm:max-w-110 sm:rounded-2xl sm:px-10 sm:py-8 sm:shadow-sm">
                <div className="flex flex-col items-center gap-6 text-center">
                    <Link to="/">
                        <Logo className="h-[50px] text-[#133556] dark:text-white" />
                    </Link>
                    <div className="flex flex-col gap-2 md:gap-3">
                        <h1 className="text-xl font-semibold text-primary md:text-display-xs">Welkom terug</h1>
                        <p className="text-md text-tertiary">Vul je gegevens in om in te loggen.</p>
                    </div>
                </div>

                <Form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-5">
                        <Input isRequired type="email" name="email" label="E-mailadres" placeholder="naam@voorbeeld.nl" size="lg" />
                        <Input
                            isRequired
                            type="password"
                            name="password"
                            label="Wachtwoord"
                            size="lg"
                            placeholder="••••••••••••"
                            inputClassName="placeholder:text-placeholder/50"
                        />
                    </div>

                    {error && <p className="text-sm text-error-primary">{error}</p>}

                    <div className="flex items-center">
                        <Checkbox label="Onthoud mij" name="remember" />

                        <Button color="link-color" size="md" href="/forgot-password" className="ml-auto">
                            Wachtwoord vergeten
                        </Button>
                    </div>

                    <Button type="submit" size="lg" isLoading={isSubmitting} showTextWhileLoading>
                        Inloggen
                    </Button>
                </Form>

                <div className="flex justify-center gap-1 text-center">
                    <span className="text-sm text-tertiary">Nog geen account?</span>
                    <Button href="/signup" color="link-color" size="md">
                        Registreren
                    </Button>
                </div>
            </div>
        </section>
    );
}
