import { createFileRoute } from "@tanstack/react-router";
import { ForgotPasswordRouteView } from "@/features/auth";
import { stripFiltersSearch } from "@/features/filters";
import { useDocumentTitle } from "@/hooks/use-document-title";

function ForgotPasswordRoute() {
    useDocumentTitle("Wachtwoord vergeten");
    return <ForgotPasswordRouteView />;
}

export const Route = createFileRoute("/forgot-password")({
    component: ForgotPasswordRoute,
    // Outside /_layout, so the filters mean nothing here — see stripFiltersSearch.
    search: { middlewares: [stripFiltersSearch] },
});
