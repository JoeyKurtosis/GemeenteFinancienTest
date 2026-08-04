import { useLocation } from "@tanstack/react-router";

/** Route prefixes where the "Reservemutaties" toggle is relevant (matches sub-routes too). */
const reservemutatiesRoutes = ["/begroting", "/baten", "/lasten", "/trends", "/managementoverzicht"];

/** Route prefixes where the "Verslagsoort" filter is relevant (matches sub-routes too). */
const verslagsoortRoutes = ["/trends", "/benchmark", "/baten", "/managementoverzicht"];

/**
 * Routes where "Verslagsoort" applies to the index page and *not* to its sub-routes.
 *
 * /begroting alone: its overzicht tab is drawn from one report like every other page, but the
 * two begroting-vs-jaarrekening tabs put both verslagsoorten on the category axis and compare
 * them against each other. Picking one there answers nothing — queries.begroting sends those
 * two down _begroting_per_verslagsoort, which never reads the selected code.
 */
const verslagsoortIndexRoutes = ["/begroting"];

/**
 * Routes the filter summary appears on: the main navigation.
 *
 * Wider than the routes that *draw* from the filters. The selection lives in the URL and follows
 * you around, so on Dashboard and Verantwoording — neither of which reads it — it still answers
 * "what is selected", which is what every page you click through to will be drawn with.
 * Referentiegroep composes the group with a filter bar of its own, and that bar writes to this
 * same selection, so the summary tracks it.
 *
 * The utility pages are left out (/account, /instellingen, /support): nothing there is a figure,
 * so a filter panel beside them is noise.
 */
const gefilterdeRoutes = [
    "/referentiegroep",
    "/managementoverzicht",
    "/verantwoording",
    "/begroting",
    "/lasten",
    "/benchmark",
    "/baten",
    "/trends",
];

const opRoute = (pathname: string, route: string) => pathname === route || pathname.startsWith(`${route}/`);

export interface FilterRelevance {
    /** The single gemeente a page holds against a group. */
    gemeente: boolean;
    /** Always shown, but it is two different questions — see `referentieLabel`. */
    referentie: boolean;
    referentieLabel: "Gemeente" | "Referentiegroep";
    inwoner: boolean;
    verslagsoort: boolean;
    reservemutaties: boolean;
    /** False where the route draws from no filter at all, so the summary can stay off the page. */
    any: boolean;
}

/**
 * Which filters the route being viewed actually draws with.
 *
 * Shared between the sidebar's filter menu and the summary row above the charts, which have to
 * agree: a chip describing a filter the menu does not offer here would be describing something
 * the reader cannot act on, and cannot see.
 *
 * Route relevance only. The sidebar additionally hides Verslagsoort when the selected year offers
 * a single one — a statement about the data rather than about the route, so it stays at that call
 * site.
 */
export function useFilterRelevance(): FilterRelevance {
    const { pathname } = useLocation();

    // The one route whose filters read differently: it has no single gemeente to compare against
    // a group, so the ComboBox is left off and the multi-select becomes the report's "Gemeente"
    // slicer — the set of municipalities every average is taken over.
    const isTrends = opRoute(pathname, "/trends");

    return {
        gemeente: !isTrends,
        referentie: true,
        referentieLabel: isTrends ? "Gemeente" : "Referentiegroep",
        inwoner: isTrends,
        verslagsoort:
            verslagsoortRoutes.some((route) => opRoute(pathname, route)) ||
            verslagsoortIndexRoutes.some((route) => pathname === route || pathname === `${route}/`),
        reservemutaties: reservemutatiesRoutes.some((route) => opRoute(pathname, route)),
        // The dashboard index is matched exactly — every path starts with "/", so opRoute would
        // let the summary onto the utility pages too.
        any: pathname === "/" || gefilterdeRoutes.some((route) => opRoute(pathname, route)),
    };
}
