import { createFileRoute } from "@tanstack/react-router";
import { DashboardRouteView } from "@/features/dashboard";

export const Route = createFileRoute("/_layout/")({
    component: DashboardRouteView,
    context: () => ({
        title: "Gemeentefinanciën",
        description: "Personeel en financiën in perspectief",
        showBreadCrumbs: false,
    }),
});
