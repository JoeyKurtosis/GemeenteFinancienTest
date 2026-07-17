import { createFileRoute } from "@tanstack/react-router";
import { ReferentieGroepRouteView } from "@/features/referentiegroep";

export const Route = createFileRoute("/_layout/referentiegroep")({
    component: ReferentieGroepRouteView,
    context: () => ({
        title: "Referentiegroep",
        description: "Zelf samenstellen",
        showBreadCrumbs: true,
    }),
});
