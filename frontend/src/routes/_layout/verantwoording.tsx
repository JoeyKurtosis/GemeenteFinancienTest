import { createFileRoute } from "@tanstack/react-router";
import { VerantwoordingRouteView } from "@/features/verantwoording";

export const Route = createFileRoute("/_layout/verantwoording")({
    component: VerantwoordingRouteView,
    context: () => ({
        title: "Verantwoording",
        description: "Wat is wat?",
        showBreadCrumbs: true,
    }),
});
