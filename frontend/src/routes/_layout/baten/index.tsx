import { createFileRoute } from "@tanstack/react-router";
import { BatenAlleInkomstenbronnenRouteView } from "@/features/baten";

export const Route = createFileRoute("/_layout/baten/")({
    component: BatenAlleInkomstenbronnenRouteView,
    context: () => ({
        title: "Baten",
        description: "Alle inkomstenbronnen",
        showBreadCrumbs: true,
    }),
});
