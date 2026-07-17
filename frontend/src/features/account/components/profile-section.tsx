import React, { useEffect, useState } from "react";
import { Mail01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Form } from "@/components/base/form/form";
import { Input } from "@/components/base/input/input";
import { useAuth } from "@/features/auth";
import { updateProfile } from "../api";
import { showToast } from "./show-toast";

export function ProfileSection() {
    const { user, setUser } = useAuth();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    function resetFromUser() {
        setFirstName(user?.first_name ?? "");
        setLastName(user?.last_name ?? "");
        setEmail(user?.email ?? "");
    }

    useEffect(() => {
        resetFromUser();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const updated = await updateProfile({ first_name: firstName, last_name: lastName, email });
            setUser(updated);
            showToast("success", "Opgeslagen", "Je persoonlijke gegevens zijn bijgewerkt.");
        } catch (error) {
            showToast("error", "Fout bij opslaan", error instanceof Error ? error.message : "Er is iets misgegaan. Probeer het opnieuw.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-primary">Persoonlijke Info</h2>
                <p className="text-sm text-tertiary">Beheer je naam en e-mailadres. Deze gegevens worden gebruikt voor je account en communicatie.</p>
            </div>

            <hr className="border-secondary" />

            <div className="grid gap-5 sm:grid-cols-2">
                <Input isRequired label="Voornaam" name="first_name" value={firstName} onChange={setFirstName} placeholder="Voornaam" />
                <Input isRequired label="Achternaam" name="last_name" value={lastName} onChange={setLastName} placeholder="Achternaam" />
            </div>

            <Input isRequired type="email" icon={Mail01} label="E-mailadres" name="email" value={email} onChange={setEmail} placeholder="naam@voorbeeld.nl" />

            <hr className="border-secondary" />

            <div className="flex justify-end gap-3">
                <Button type="button" color="secondary" isDisabled={isSubmitting} onClick={resetFromUser}>
                    Annuleren
                </Button>
                <Button type="submit" color="primary" isLoading={isSubmitting} showTextWhileLoading>
                    Opslaan
                </Button>
            </div>
        </Form>
    );
}
