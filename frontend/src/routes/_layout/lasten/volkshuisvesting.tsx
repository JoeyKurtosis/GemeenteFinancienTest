import { createFileRoute } from "@tanstack/react-router";
import { LastenVolkshuisvestingRouteView } from "@/features/lasten";

export const Route = createFileRoute("/_layout/lasten/volkshuisvesting")({
    component: LastenVolkshuisvestingRouteView,
    context: () => ({
        title: "Volkshuisvesting",
        description: "Volkshuisvesting, leefomgeving en stedelijke vernieuwing",
        showBreadCrumbs: true,
        crumbLabels: { lasten: "Lasten", volkshuisvesting: "Volkshuisvesting" },
    }),
});
