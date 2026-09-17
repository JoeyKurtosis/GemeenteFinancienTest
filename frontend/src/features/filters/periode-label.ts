import { useLocation } from "@tanstack/react-router";
import { useFilters } from "./context/filters-context";
import { opRoute, useFilterRelevance } from "./relevance";

/**
 * Route prefixes whose title carries the period (matches sub-routes too).
 *
 * Narrower than FilterRelevance.any, which is about where the filter *summary* belongs: the
 * selection follows you around the app, so that panel appears on Referentiegroep and
 * Verantwoording as well, answering "what is selected". A year in the page title is a different
 * claim — it says the figures on this page are those of that period — so it is reserved for the
 * pages that actually plot them, plus Referentiegroep, whose municipality list and map
 * follow the selected year. Everything else (Home, Over ons, Verantwoording,
 * Instellingen, Support, Account) keeps its plain title.
 */
const periodeRoutes = ["/in-een-oogopslag", "/begroting-vs-jaarrekening", "/lasten", "/baten", "/benchmark", "/trends", "/referentiegroep"];

/**
 * The period the page's figures are drawn from, as one phrase: "Begroting 2026", or bare "2026"
 * where the route picks no verslagsoort.
 *
 * Printed after the page title, so a reader who never opens the sidebar — or who arrives on a
 * shared URL — still knows which report they are looking at. Reads the URL-backed filters, the
 * same ones the charts were drawn with.
 *
 * Null where there is nothing to name, which the caller renders as no suffix at all.
 */
export function usePeriodeLabel(): string | null {
    const { pathname } = useLocation();
    const { applied, options, isLoading } = useFilters();
    const relevance = useFilterRelevance();

    // Nothing to name: a page that plots no figures, or a year that has not been resolved yet —
    // DEFAULT_SEARCH omits `jaar` and the backend fills it from /api/iv3/filters/, so
    // `applied.jaar` is null for the opening render(s).
    if (!periodeRoutes.some((route) => opRoute(pathname, route)) || isLoading || !applied.jaar) return null;

    // Only where the route actually offers the choice. On /lasten and /begroting-vs-jaarrekening
    // the verslagsoort is not the reader's to pick, so naming one would claim more than the page
    // does — those read "(2026)".
    //
    // The label is bare ("Begroting"), never its own year: the code carries that ("2026X000"),
    // which is why the year is joined on here rather than assumed to be in there already.
    const verslagsoort = relevance.verslagsoort ? options.verslagsoorten.find((soort) => soort.id === applied.verslagsoort)?.label : undefined;

    return verslagsoort ? `${verslagsoort} ${applied.jaar}` : String(applied.jaar);
}
