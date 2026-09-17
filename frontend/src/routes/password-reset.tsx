import { createFileRoute } from "@tanstack/react-router";
import { PasswordResetRouteView } from "@/features/auth";
import { stripFiltersSearch } from "@/features/filters";
import { useDocumentTitle } from "@/hooks/use-document-title";

function PasswordResetRoute() {
    useDocumentTitle("Wachtwoord resetten");
    return <PasswordResetRouteView />;
}

export const Route = createFileRoute("/password-reset")({
    component: PasswordResetRoute,
    // Outside /_layout, so the filters mean nothing here — see stripFiltersSearch. It removes
    // only those six keys, so the `token` the emailed link carries is untouched.
    search: { middlewares: [stripFiltersSearch] },
});
