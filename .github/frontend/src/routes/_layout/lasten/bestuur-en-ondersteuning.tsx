import { createFileRoute } from "@tanstack/react-router";
import { LastenBestuurEnOndersteuningRouteView } from "@/features/lasten";

export const Route = createFileRoute("/_layout/lasten/bestuur-en-ondersteuning")({
    component: LastenBestuurEnOndersteuningRouteView,
    context: () => ({
        title: "Bestuur en ondersteuning",
        description: "Lasten per taakveld",
        showBreadCrumbs: true,
        crumbLabels: { lasten: "Lasten", "bestuur-en-ondersteuning": "Bestuur en ondersteuning" },
    }),
});
