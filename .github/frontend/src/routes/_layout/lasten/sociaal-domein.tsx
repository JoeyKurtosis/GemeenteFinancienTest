import { createFileRoute } from "@tanstack/react-router";
import { LastenSociaalDomeinRouteView } from "@/features/lasten";

export const Route = createFileRoute("/_layout/lasten/sociaal-domein")({
    component: LastenSociaalDomeinRouteView,
    context: () => ({
        title: "Sociaal domein",
        description: "Lasten per taakveld",
        showBreadCrumbs: true,
        crumbLabels: { lasten: "Lasten", "sociaal-domein": "Sociaal domein" },
    }),
});
