import { createFileRoute } from "@tanstack/react-router";
import { TwoFactorRouteView } from "@/features/auth";
import { stripFiltersSearch } from "@/features/filters";
import { useDocumentTitle } from "@/hooks/use-document-title";

function TwoFactorRoute() {
    const { intent } = Route.useSearch();
    useDocumentTitle(intent === "signup" ? "E-mailadres bevestigen" : "Tweestapsverificatie");
    return <TwoFactorRouteView />;
}

export const Route = createFileRoute("/2fa")({
    component: TwoFactorRoute,
    // The page serves two flows that differ only in copy. A search param rather than router state,
    // so reloading after a detour to the mail client keeps the right wording. Optional, and
    // anything unrecognised is dropped, so the bare /2fa that login navigates to still means login.
    validateSearch: (search: Record<string, unknown>): { intent?: "signup" } =>
        search.intent === "signup" ? { intent: "signup" } : {},
    // Outside /_layout, so the filters mean nothing here either — see stripFiltersSearch. Nothing
    // links here with `search={true}` today, but the rule is "no auth route takes filters".
    search: { middlewares: [stripFiltersSearch] },
});
