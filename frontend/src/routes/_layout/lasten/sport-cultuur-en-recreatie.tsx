import { createFileRoute } from "@tanstack/react-router";
import { LastenSportCultuurEnRecreatieRouteView } from "@/features/lasten";

export const Route = createFileRoute("/_layout/lasten/sport-cultuur-en-recreatie")({
    component: LastenSportCultuurEnRecreatieRouteView,
    context: () => ({
        title: "Sport, cultuur en recreatie",
        description: "Lasten per taakveld",
        showBreadCrumbs: true,
        crumbLabels: { lasten: "Lasten", "sport-cultuur-en-recreatie": "Sport, cultuur en recreatie" },
    }),
});
