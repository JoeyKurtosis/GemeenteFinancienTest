import { createFileRoute } from "@tanstack/react-router";
import { OverOnsRouteView } from "@/features/over-ons";

export const Route = createFileRoute("/_layout/over-ons")({
    component: OverOnsRouteView,
    context: () => ({
        title: "Over ons",
        description: "Meer over het Gemeentefinanciën platform",
        showBreadCrumbs: true,
    }),
});
