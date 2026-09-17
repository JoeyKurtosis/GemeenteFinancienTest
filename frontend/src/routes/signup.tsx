import { createFileRoute } from "@tanstack/react-router";
import { SignupRouteView } from "@/features/auth";
import { stripFiltersSearch } from "@/features/filters";
import { useDocumentTitle } from "@/hooks/use-document-title";

function SignupRoute() {
    useDocumentTitle("Account aanmaken");
    return <SignupRouteView />;
}

export const Route = createFileRoute("/signup")({
    component: SignupRoute,
    // Outside /_layout, so the filters mean nothing here — see stripFiltersSearch.
    search: { middlewares: [stripFiltersSearch] },
});
