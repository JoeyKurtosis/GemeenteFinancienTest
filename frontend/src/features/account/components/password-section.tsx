import React, { useState } from "react";
import { Lock01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Form } from "@/components/base/form/form";
import { Input } from "@/components/base/input/input";
import { changePassword } from "../api";
import { showToast } from "./show-toast";

export function PasswordSection() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    function reset() {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setError(null);
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);

        if (newPassword !== confirmPassword) {
            setError("De nieuwe wachtwoorden komen niet overeen.");
            return;
        }

        setIsSubmitting(true);

        try {
            await changePassword({ current_password: currentPassword, new_password: newPassword });
            reset();
            showToast("success", "Wachtwoord gewijzigd", "Je wachtwoord is succesvol bijgewerkt.");
        } catch (err) {
            showToast("error", "Fout bij wijzigen", err instanceof Error ? err.message : "Er is iets misgegaan. Probeer het opnieuw.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-primary">Wachtwoord</h2>
                <p className="text-sm text-tertiary">Kies een sterk, uniek wachtwoord om je account veilig te houden. Voer je huidige wachtwoord in om een nieuwe in te stellen.</p>
            </div>

            <hr className="border-secondary" />

            <Input
                isRequired
                type="password"
                icon={Lock01}
                label="Huidig wachtwoord"
                name="current_password"
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder="••••••••••••"
            />
            <Input
                isRequired
                type="password"
                icon={Lock01}
                label="Nieuw wachtwoord"
                name="new_password"
                value={newPassword}
                onChange={setNewPassword}
                minLength={8}
                hint="Je nieuwe wachtwoord moet minimaal 8 tekens bevatten."
                placeholder="••••••••••••"
            />
            <Input
                isRequired
                type="password"
                icon={Lock01}
                label="Bevestig nieuw wachtwoord"
                name="confirm_password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                isInvalid={Boolean(error)}
                hint={error ?? undefined}
                placeholder="••••••••••••"
            />

            <hr className="border-secondary" />

            <div className="flex justify-end gap-3">
                <Button type="button" color="secondary" isDisabled={isSubmitting} onClick={reset}>
                    Annuleren
                </Button>
                <Button type="submit" color="primary" isLoading={isSubmitting} showTextWhileLoading>
                    Opslaan
                </Button>
            </div>
        </Form>
    );
}
