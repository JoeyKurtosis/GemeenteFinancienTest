import { createFileRoute } from "@tanstack/react-router";
import { GemeentelijkeStandRouteView } from "@/features/gemeentelijkestand";

export const Route = createFileRoute("/_layout/gemeentelijkestand")({
    component: GemeentelijkeStandRouteView,
    context: () => ({
        title: "Gemeentelijke stand",
        description: "De gemeentelijke stand van zaken",
        showBreadCrumbs: true,
    }),
});
