import { createFileRoute } from "@tanstack/react-router";
import { BegrotingVsJaarrekeningAbsoluteBedragenRouteView } from "@/features/begroting";

export const Route = createFileRoute("/_layout/begroting/begroting-vs-jaarrekening-absolute-bedragen")({
    component: BegrotingVsJaarrekeningAbsoluteBedragenRouteView,
    context: () => ({
        title: "Begroting versus Jaarrekening",
        description: "Absolute bedragen",
        showBreadCrumbs: true,
    }),
});
