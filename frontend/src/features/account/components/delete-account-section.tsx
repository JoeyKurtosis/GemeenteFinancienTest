import { useState } from "react";
import { Trash01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { useAuth } from "@/features/auth";
import { deleteAccount } from "../api";
import { DeleteAccountModal } from "./delete-account-modal";
import { showToast } from "./show-toast";

export function DeleteAccountSection() {
    const { isAdmin, setUser } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // The endpoint refuses beheerder accounts — removing one could take the last way into /admin/
    // with it — so the section is not offered to them at all rather than failing on confirm.
    if (isAdmin) {
        return null;
    }

    function handleOpenChange(open: boolean) {
        if (isDeleting) {
            return;
        }
        setIsOpen(open);
        if (!open) {
            setPassword("");
            setError(null);
        }
    }

    async function handleConfirm() {
        setError(null);
        setIsDeleting(true);

        try {
            await deleteAccount(password);
            setIsOpen(false);
            setPassword("");
            // The session is already gone server-side; clearing the user here is what makes
            // AccountRouteView redirect to /login.
            setUser(null);
            showToast("success", "Account verwijderd", "Je account en je gegevens zijn permanent verwijderd.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Er is iets misgegaan. Probeer het opnieuw.");
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-primary">Account verwijderen</h2>
                <p className="text-sm text-tertiary">
                    Verwijder je account permanent. Je persoonlijke gegevens en je notities worden gewist en zijn daarna niet meer terug te halen.
                </p>
            </div>

            <hr className="border-secondary" />

            <div className="flex justify-end">
                <Button color="primary-destructive" iconLeading={Trash01} onClick={() => setIsOpen(true)}>
                    Account verwijderen
                </Button>
            </div>

            <DeleteAccountModal
                isOpen={isOpen}
                onOpenChange={handleOpenChange}
                password={password}
                onPasswordChange={setPassword}
                error={error}
                isDeleting={isDeleting}
                onConfirm={handleConfirm}
            />
        </div>
    );
}
