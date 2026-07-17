import { createFileRoute } from "@tanstack/react-router";
import { LastenAlleTaakveldenRouteView } from "@/features/lasten";

export const Route = createFileRoute("/_layout/lasten/")({
    component: LastenAlleTaakveldenRouteView,
    context: () => ({
        title: "Lasten",
        description: "Alle taakvelden",
        showBreadCrumbs: true,
    }),
});
