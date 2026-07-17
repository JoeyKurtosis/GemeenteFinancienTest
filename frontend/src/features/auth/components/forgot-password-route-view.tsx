import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Key01 } from "@untitledui/icons";
import Logo from "@/assets/icons/logo_venster.svg?react";
import { Button } from "@/components/base/buttons/button";
import { Form } from "@/components/base/form/form";
import { Input } from "@/components/base/input/input";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { requestPasswordReset } from "../api";

export function ForgotPasswordRouteView() {
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        const data = Object.fromEntries(new FormData(e.currentTarget));

        try {
            await requestPasswordReset(data.email as string);
            setIsSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Verzoek mislukt");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="min-h-screen overflow-hidden bg-primary px-4 py-12 md:px-8 md:pt-24">
            <div className="mx-auto flex w-full max-w-90 flex-col gap-8">
                <div className="flex flex-col items-center gap-6 text-center">
                    <Link to="/">
                        <Logo className="h-[50px] text-[#133556] dark:text-white" />
                    </Link>

                    <div className="flex flex-col gap-2 md:gap-3">
                        <h1 className="text-xl font-semibold text-primary md:text-display-xs">Wachtwoord vergeten?</h1>
                        <p className="self-stretch text-md text-tertiary">
                            {isSuccess
                                ? "We hebben je een e-mail gestuurd met instructies om je wachtwoord te resetten."
                                : "Geen zorgen, we sturen je instructies om het te resetten."}
                        </p>
                    </div>
                </div>

                {!isSuccess && (
                    <Form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        <Input isRequired hideRequiredIndicator label="E-mailadres" type="email" name="email" placeholder="naam@voorbeeld.nl" size="lg" />

                        {error && <p className="text-sm text-error-primary">{error}</p>}

                        <Button type="submit" size="lg" isLoading={isSubmitting} showTextWhileLoading>
                            Wachtwoord resetten
                        </Button>
                    </Form>
                )}

                <div className="flex justify-center text-center">
                    <Button size="md" color="link-gray" href="/login" className="mx-auto" iconLeading={ArrowLeft}>
                        Terug naar inloggen
                    </Button>
                </div>
            </div>
        </section>
    );
}
