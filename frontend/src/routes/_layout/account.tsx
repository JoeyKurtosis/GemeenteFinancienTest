import { createFileRoute } from "@tanstack/react-router";
import { AccountRouteView } from "@/features/account";

export const Route = createFileRoute("/_layout/account")({
    component: AccountRouteView,
    // No title → the layout's default PageHeader is skipped; the cover banner is the header.
    context: () => ({ showBreadCrumbs: false }),
});
