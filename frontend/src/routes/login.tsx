import { createFileRoute } from "@tanstack/react-router";
import { LoginRouteView } from "@/features/auth";
import { stripFiltersSearch } from "@/features/filters";
import { useDocumentTitle } from "@/hooks/use-document-title";

function LoginRoute() {
    useDocumentTitle("Inloggen");
    return <LoginRouteView />;
}

export const Route = createFileRoute("/login")({
    component: LoginRoute,
    // Outside /_layout, so the filters mean nothing here — see stripFiltersSearch.
    search: { middlewares: [stripFiltersSearch] },
});
