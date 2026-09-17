import { createFileRoute } from "@tanstack/react-router";
import { BegrotingVsJaarrekeningRouteView } from "@/features/begroting";

export const Route = createFileRoute("/_layout/begroting-vs-jaarrekening")({
    component: BegrotingVsJaarrekeningRouteView,
    context: () => ({
        title: "Begroting versus Jaarrekening",
        // De eenheid staat niet in de ondertitel: die kiest de lezer op de pagina zelf, met de
        // toggle tussen euro per inwoner en absolute bedragen.
        description: "Wat er begroot was tegenover wat er gerealiseerd is",
        showBreadCrumbs: true,
    }),
});
