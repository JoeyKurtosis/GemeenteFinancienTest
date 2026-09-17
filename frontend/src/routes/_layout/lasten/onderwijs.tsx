import { createFileRoute } from "@tanstack/react-router";
import { lastenUitleg, LastenOnderwijsRouteView } from "@/features/lasten";

export const Route = createFileRoute("/_layout/lasten/onderwijs")({
    component: LastenOnderwijsRouteView,
    context: () => ({
        title: "Onderwijs",
        description: "Lasten per taakveld",
        showBreadCrumbs: true,
        crumbLabels: { lasten: "Lasten", onderwijs: "Onderwijs" },
        subContent: lastenUitleg("4"),
    }),
});
