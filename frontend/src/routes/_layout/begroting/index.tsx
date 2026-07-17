import { createFileRoute } from "@tanstack/react-router";
import { BegrotingRouteView } from "@/features/begroting";

export const Route = createFileRoute("/_layout/begroting/")({
    component: BegrotingRouteView,
    context: () => ({
        title: "Begroting",
        description: "In één oogopslag",
        showBreadCrumbs: true,
    }),
});
