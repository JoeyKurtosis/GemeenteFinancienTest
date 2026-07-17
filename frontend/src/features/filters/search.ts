/**
 * The filters live in the URL so a filtered view can be shared and survives a reload.
 *
 * The multi-selects (referentiegroep, inwonergroep) are kept as comma-joined strings
 * rather than arrays: TanStack Router JSON-encodes arrays into the query string, which
 * would turn a handful of gemeente codes into `?referentie=%5B%22GM0363%22%5D`.
 */
import type { Selection } from "react-aria-components";
export interface FiltersSearch {
    gemeente?: string;
    referentie?: string;
    inwoner?: string;
    verslagsoort?: string;
    jaar?: number;
    reserve?: boolean;
}

/** Route `validateSearch`. Anything unparseable is dropped rather than throwing. */
export const validateFiltersSearch = (search: Record<string, unknown>): FiltersSearch => {
    const parsed: FiltersSearch = {};

    for (const key of ["gemeente", "referentie", "inwoner", "verslagsoort"] as const) {
        const value = search[key];
        if (typeof value === "string" && value.length > 0) {
            parsed[key] = value;
        }
    }

    const jaar = Number(search.jaar);
    if (Number.isInteger(jaar) && jaar > 1900) {
        parsed.jaar = jaar;
    }

    // Tri-state: absent means "not chosen yet" and falls back to the default, so an
    // explicit `false` has to survive the round trip rather than being dropped as empty.
    if (search.reserve === true || search.reserve === "true") {
        parsed.reserve = true;
    } else if (search.reserve === false || search.reserve === "false") {
        parsed.reserve = false;
    }

    return parsed;
};

/**
 * "Alles" for either multi-select. Selecting every gemeente would otherwise write ~342
 * codes into the query string, so it is carried as a sentinel and expanded to the
 * react-aria "all" selection by the FiltersProvider.
 */
export const ALLE_SELECTIE = "alle";

export const parseCodes = (value?: string): string[] => (value ? value.split(",").filter(Boolean) : []);

/** Empty selections are dropped from the URL rather than serialised as `?referentie=`. */
export const serializeCodes = (codes: string[]): string | undefined => (codes.length > 0 ? codes.join(",") : undefined);

/**
 * A multi-select selection as the URL carries it: the codes, or the "alle" sentinel once
 * every option is picked.
 *
 * Shared rather than inlined at each call site, because "did the user pick everything?" has to
 * be answered identically everywhere — the sidebar, the referentiegroep page, and the round
 * trip back out of the URL. Answer it differently in one place and a full selection starts
 * serialising as 342 codes that no longer read back as "alle".
 */
export const serializeSelectie = (keys: Selection, opties: readonly { id: string }[]): string | undefined => {
    const codes = keys === "all" ? opties.map((optie) => optie.id) : [...keys].map(String);
    const isAlles = opties.length > 0 && codes.length === opties.length;
    return isAlles ? ALLE_SELECTIE : serializeCodes(codes);
};

/**
 * An *applied* selection as a chart request carries it: the sentinel, or the codes.
 *
 * The counterpart of serializeSelectie, and deliberately not it — this one has no option list to
 * compare against and does not need one. An applied selection has already been through the URL,
 * where "everything" is the sentinel and nothing else is, so the answer is on the value itself.
 *
 * That is the whole point. The chart hooks used to expand "all" back into ~342 gemeente codes off
 * options.gemeenten, which made every chart wait for /filters/ before it could ask its question —
 * and then ask it again once the answer arrived. The backend resolves the sentinel itself now; see
 * ChartView._referentie.
 */
export const serializeApplied = (keys: Selection): string | undefined =>
    keys === "all" ? ALLE_SELECTIE : serializeCodes([...keys].map(String));
