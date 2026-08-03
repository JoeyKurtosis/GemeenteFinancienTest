import { createFileRoute } from "@tanstack/react-router";
import { ManagementoverzichtRouteView } from "@/features/managementoverzicht";

export const Route = createFileRoute("/_layout/managementoverzicht")({
    component: ManagementoverzichtRouteView,
    context: () => ({
        title: "Managementoverzicht",
        description: "Een beknopt beeld",
        showBreadCrumbs: true,
    }),
});
