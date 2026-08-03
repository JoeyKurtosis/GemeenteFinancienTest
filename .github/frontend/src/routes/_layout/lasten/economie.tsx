import { createFileRoute } from "@tanstack/react-router";
import { LastenEconomieRouteView } from "@/features/lasten";

export const Route = createFileRoute("/_layout/lasten/economie")({
    component: LastenEconomieRouteView,
    context: () => ({
        title: "Economie",
        description: "Lasten per taakveld",
        showBreadCrumbs: true,
        crumbLabels: { lasten: "Lasten", economie: "Economie" },
    }),
});
