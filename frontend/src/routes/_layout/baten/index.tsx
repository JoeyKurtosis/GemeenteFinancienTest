import { createFileRoute } from "@tanstack/react-router";
import { batenUitleg, BatenAlleInkomstenbronnenRouteView } from "@/features/baten";

export const Route = createFileRoute("/_layout/baten/")({
    component: BatenAlleInkomstenbronnenRouteView,
    context: () => ({
        title: "Baten",
        description: "Alle inkomstenbronnen",
        showBreadCrumbs: true,
        subContent: batenUitleg("alle"),
    }),
});
