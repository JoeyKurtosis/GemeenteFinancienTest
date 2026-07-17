import { createFileRoute } from "@tanstack/react-router";
import { SupportRouteView } from "@/features/support";

export const Route = createFileRoute("/_layout/support")({
    component: SupportRouteView,
    context: () => ({
        title: "Support",
    }),
});
