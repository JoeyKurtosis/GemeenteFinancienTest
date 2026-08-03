import { createFileRoute } from "@tanstack/react-router";
import { BatenOverigeBatenRijkRouteView } from "@/features/baten";

export const Route = createFileRoute("/_layout/baten/overige-baten-rijk")({
    component: BatenOverigeBatenRijkRouteView,
    context: () => ({
        title: "Overige baten rijk",
        description: "Specifieke uitkeringen (spuks)",
        showBreadCrumbs: true,
        crumbLabels: { baten: "Baten", "overige-baten-rijk": "Overige baten rijk" },
    }),
});
