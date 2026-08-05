import { createFileRoute } from "@tanstack/react-router";
import { PasswordResetRouteView } from "@/features/auth";
import { useDocumentTitle } from "@/hooks/use-document-title";

function PasswordResetRoute() {
    useDocumentTitle("Wachtwoord resetten");
    return <PasswordResetRouteView />;
}

export const Route = createFileRoute("/password-reset")({
    component: PasswordResetRoute,
});
