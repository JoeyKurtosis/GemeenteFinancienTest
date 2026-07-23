import { Navigate } from "@tanstack/react-router";
import { useAuth } from "@/features/auth";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { FormulesSection } from "./formules-section";

export function InstellingenRouteView() {
    useDocumentTitle("Instellingen");

    const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();

    if (authLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <p className="text-sm text-tertiary">Laden...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-secondary py-16 text-center">
                <h2 className="text-lg font-semibold text-primary">Geen toegang</h2>
                <p className="max-w-sm text-sm text-tertiary">
                    Je hebt geen rechten om de dashboard-instellingen te wijzigen. Neem contact op met een beheerder.
                </p>
            </div>
        );
    }

    return (
        <div className="mx-auto flex w-full flex-col">
            <FormulesSection />
        </div>
    );
}
