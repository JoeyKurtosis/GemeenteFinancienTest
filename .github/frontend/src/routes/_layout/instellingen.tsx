import { createFileRoute } from "@tanstack/react-router";
import { InstellingenRouteView } from "@/features/instellingen";

export const Route = createFileRoute("/_layout/instellingen")({
    component: RouteComponent,
    context: () => ({
        title: "Instellingen",
        showBreadCrumbs: true,
    }),
});

function RouteComponent() {
    return <InstellingenRouteView />;
}
