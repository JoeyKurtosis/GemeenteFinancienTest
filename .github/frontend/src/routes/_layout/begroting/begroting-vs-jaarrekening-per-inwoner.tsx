import { createFileRoute } from "@tanstack/react-router";
import { BegrotingVsJaarrekeningPerInwonerRouteView } from "@/features/begroting";

export const Route = createFileRoute("/_layout/begroting/begroting-vs-jaarrekening-per-inwoner")({
    component: BegrotingVsJaarrekeningPerInwonerRouteView,
    context: () => ({
        title: "Begroting versus Jaarrekening",
        description: "Euro per inwoner",
        showBreadCrumbs: true,
    }),
});
