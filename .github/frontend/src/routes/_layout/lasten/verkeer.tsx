import { createFileRoute } from "@tanstack/react-router";
import { LastenVerkeerRouteView } from "@/features/lasten";

export const Route = createFileRoute("/_layout/lasten/verkeer")({
    component: LastenVerkeerRouteView,
    context: () => ({
        title: "Verkeer",
        description: "Verkeer, vervoer en waterstaat",
        showBreadCrumbs: true,
        crumbLabels: { lasten: "Lasten", verkeer: "Verkeer" },
    }),
});
