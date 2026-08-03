import { createFileRoute } from "@tanstack/react-router";
import { LoginRouteView } from "@/features/auth";
import { useDocumentTitle } from "@/hooks/use-document-title";

function LoginRoute() {
    useDocumentTitle("Inloggen");
    return <LoginRouteView />;
}

export const Route = createFileRoute("/login")({
    component: LoginRoute,
});
