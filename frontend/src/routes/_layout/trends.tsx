import { createFileRoute } from "@tanstack/react-router";
import { TrendsRouteView } from "@/features/trends";

export const Route = createFileRoute("/_layout/trends")({
    component: TrendsRouteView,
    context: () => ({
        title: "Trends",
        description: "De gemeentelijke stand van zaken",
        showBreadCrumbs: true,
    }),
});
