import { createFileRoute } from "@tanstack/react-router";
import { InstellingenRouteView } from "@/features/instellingen";

export const Route = createFileRoute("/_layout/instellingen")({
    component: RouteComponent,
    context: () => ({
        title: "Instellingen",
        description: "Bepaal wat de grafieken op het dashboard berekenen en tonen",
        showBreadCrumbs: true,
    }),
});

function RouteComponent() {
    return <InstellingenRouteView />;
}
