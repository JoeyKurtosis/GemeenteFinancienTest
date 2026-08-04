import { createFileRoute } from "@tanstack/react-router";
import { TwoFactorRouteView } from "@/features/auth";
import { useDocumentTitle } from "@/hooks/use-document-title";

function TwoFactorRoute() {
    useDocumentTitle("Two-factor Authenticatie");
    return <TwoFactorRouteView />;
}

export const Route = createFileRoute("/2fa")({
    component: TwoFactorRoute,
});
