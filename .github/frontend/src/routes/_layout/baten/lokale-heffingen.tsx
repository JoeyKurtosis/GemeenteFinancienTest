import { createFileRoute } from "@tanstack/react-router";
import { BatenLokaleHeffingenRouteView } from "@/features/baten";

export const Route = createFileRoute("/_layout/baten/lokale-heffingen")({
    component: BatenLokaleHeffingenRouteView,
    context: () => ({
        title: "Lokale heffingen",
        description: "Baten uit lokale heffingen",
        showBreadCrumbs: true,
        crumbLabels: { baten: "Baten", "lokale-heffingen": "Lokale heffingen" },
    }),
});
