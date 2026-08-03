import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle } from "@untitledui/icons";
import Logo from "@/assets/icons/logo_venster.svg?react";
import { Button } from "@/components/base/buttons/button";
import { Form } from "@/components/base/form/form";
import { HintText } from "@/components/base/input/hint-text";
import { Input, InputBase, TextField } from "@/components/base/input/input";
import { cx } from "@/utils/cx";
import { signup } from "../api";
import { useAuth } from "../context/auth-context";

export function SignupRouteView() {
    const { setUser } = useAuth();
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        const data = Object.fromEntries(new FormData(e.currentTarget));

        try {
            const user = await signup(data.name as string, data.email as string, data.password as string);
            setUser(user);
            navigate({ to: "/" });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Registratie mislukt");
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
                        <h1 className="text-xl font-semibold text-primary md:text-display-xs">Account aanmaken</h1>
                        <p className="text-md text-tertiary">Maak in minder dan 2 minuten een account aan.</p>
                    </div>
                </div>

                <Form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-5">
                        <Input isRequired name="name" label="Naam" placeholder="Vul je naam in" size="lg" />
                        <Input isRequired type="email" name="email" label="E-mailadres" placeholder="naam@voorbeeld.nl" size="lg" />
                        <TextField aria-label="Wachtwoord" isRequired size="lg" name="password" value={password} onChange={setPassword} minLength={8}>
                            <InputBase type="password" placeholder="Maak een wachtwoord" />
                            <HintText className="flex items-center gap-1">
                                <CheckCircle
                                    className={cx(
                                        "size-4 stroke-[2.25px] text-fg-quaternary group-invalid:text-fg-error-secondary",
                                        password.length >= 8 && "text-fg-success-primary",
                                    )}
                                />
                                Minimaal 8 tekens.
                            </HintText>
                        </TextField>
                    </div>

                    {error && <p className="text-sm text-error-primary">{error}</p>}

                    <Button type="submit" size="lg" isLoading={isSubmitting} showTextWhileLoading>
                        Account aanmaken
                    </Button>
                </Form>

                <div className="flex justify-center gap-1 text-center">
                    <span className="text-sm text-tertiary">Heb je al een account?</span>
                    <Button href="/login" color="link-color" size="md">
                        Inloggen
                    </Button>
                </div>
            </div>
        </section>
    );
}
