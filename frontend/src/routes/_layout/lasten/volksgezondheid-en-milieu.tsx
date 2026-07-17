import { createFileRoute } from "@tanstack/react-router";
import { LastenVolksgezondheidEnMilieuRouteView } from "@/features/lasten";

export const Route = createFileRoute("/_layout/lasten/volksgezondheid-en-milieu")({
    component: LastenVolksgezondheidEnMilieuRouteView,
    context: () => ({
        title: "Volksgezondheid en milieu",
        description: "Lasten per taakveld",
        showBreadCrumbs: true,
        crumbLabels: { lasten: "Lasten", "volksgezondheid-en-milieu": "Volksgezondheid en milieu" },
    }),
});
