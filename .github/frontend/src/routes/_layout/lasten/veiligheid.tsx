import { createFileRoute } from "@tanstack/react-router";
import { LastenVeiligheidRouteView } from "@/features/lasten";

export const Route = createFileRoute("/_layout/lasten/veiligheid")({
    component: LastenVeiligheidRouteView,
    context: () => ({
        title: "Veiligheid",
        description: "Lasten per taakveld",
        showBreadCrumbs: true,
        crumbLabels: { lasten: "Lasten", veiligheid: "Veiligheid" },
    }),
});
