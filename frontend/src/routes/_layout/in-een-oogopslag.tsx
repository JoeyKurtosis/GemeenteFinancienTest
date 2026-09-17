import { createFileRoute } from "@tanstack/react-router";
import { InEenOogopslagRouteView } from "@/features/begroting";

export const Route = createFileRoute("/_layout/in-een-oogopslag")({
    component: InEenOogopslagRouteView,
    context: () => ({
        title: "In één oogopslag",
        description: "De begroting van jouw gemeente in het kort",
        showBreadCrumbs: true,
    }),
});
