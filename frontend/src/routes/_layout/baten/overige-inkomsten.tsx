import { createFileRoute } from "@tanstack/react-router";
import { batenUitleg, BatenOverigeInkomstenRouteView } from "@/features/baten";

export const Route = createFileRoute("/_layout/baten/overige-inkomsten")({
    component: BatenOverigeInkomstenRouteView,
    context: () => ({
        title: "Overige inkomsten",
        description: "Baten uit overige bronnen",
        showBreadCrumbs: true,
        crumbLabels: { baten: "Baten", "overige-inkomsten": "Overige inkomsten" },
        subContent: batenUitleg("overig"),
    }),
});
