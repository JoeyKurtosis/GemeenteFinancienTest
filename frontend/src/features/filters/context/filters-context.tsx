import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { Key, Selection } from "react-aria-components";
import { type FilterOption, type FilterOptions, fetchFilterOptions } from "../api";
import { ALLE_SELECTIE, type FiltersSearch, GEEN_SELECTIE, isSentinelSelectie, parseCodes, serializeCodes, serializeSelectie } from "../search";

const EMPTY_OPTIONS: FilterOptions = {
    jaren: [],
    jaar: null,
    gemeenten: [],
    verslagsoorten: [],
    verslagsoortenPerJaar: {},
    inwonergroepen: [],
    provincies: [],
};

/** Last three characters of a Begroting code, e.g. "2024X000" — the default verslagsoort. */
const BEGROTING_SUFFIX = "000";

/**
 * The code in `opties` that best answers a selection of `huidig`, or undefined when there is
 * nothing to point at.
 *
 * A verslagsoort code carries its year ("2024X000"), so moving between years means re-pointing
 * the selection rather than keeping or dropping it. Same soort where the new year has one —
 * a user reading Jaarrekeningen stays on Jaarrekeningen — and a Begroting otherwise, that
 * being the one every year carries.
 *
 * Used twice, and it has to be the same rule both times: the corrections pass repairs an
 * invalid URL, and onJaarChange pairs a new year with its verslagsoort in one URL update.
 */
const herpuntVerslagsoort = (opties: FilterOption[], huidig?: string): string | undefined => {
    if (opties.length === 0) return undefined;
    const zelfdeSoort = huidig ? opties.find((optie) => optie.id.endsWith(huidig.slice(-3))) : undefined;
    const begroting = opties.find((optie) => optie.id.endsWith(BEGROTING_SUFFIX));
    return (zelfdeSoort ?? begroting ?? opties[0]).id;
};

/**
 * The view the dashboard opens on, and the one Reset returns to. GM1680 is Aa en Hunze.
 *
 * Jaar and verslagsoort are both deliberately absent, for the same reason: neither can be
 * named ahead of the data. A verslagsoort code carries its year ("2024X000"), and the newest
 * year moves whenever CBS publishes — a literal here is a value that silently goes stale, and
 * did: the dashboard opened on 2024 for a year after 2025 and 2026 had landed in the fixture.
 * The corrections pass below resolves an unset jaar to the newest the backend reports, and an
 * unset verslagsoort to that year's Begroting.
 */
const DEFAULT_SEARCH: FiltersSearch = {
    gemeente: "GM1680",
    referentie: ALLE_SELECTIE,
    inwoner: ALLE_SELECTIE,
    reserve: true,
};

/** Absent reservemutaties means "not chosen yet", which is the default rather than off. */
const resolveReserve = (value?: boolean) => value ?? DEFAULT_SEARCH.reserve ?? false;

/** The filters the pages actually query with: the last ones the user applied. */
export interface AppliedFilters {
    gemeente: string | null;
    referentiegroepen: Selection;
    inwonergroepen: Selection;
    verslagsoort: string | null;
    jaar: number | null;
    reservemutaties: boolean;
}

interface FiltersContextValue {
    /** Option lists for the applied year, loaded from the IV3 database. */
    options: FilterOptions;
    isLoading: boolean;
    error: string | null;

    /**
     * Whether `applied` is settled enough to query with: the options are loaded and the
     * corrections pass has nothing left to correct. Every chart hook gates its fetch on this — see the
     * comment on isReady in FiltersProvider for what it costs not to.
     */
    isReady: boolean;

    /** The filters currently encoded in the URL and used by the pages. */
    applied: AppliedFilters;

    /** The selections shown in the sidebar. Selection changes are written straight to the URL. */
    selectedGemeente: Key | null;
    onGemeenteChange: (key: Key | null) => void;
    selectedReferentiegroepen: Selection;
    onReferentiegroepenChange: (keys: Selection) => void;
    /** Each selected size class is drawn as a line of its own on the charts. */
    selectedInwonergroepen: Selection;
    onInwonergroepenChange: (keys: Selection) => void;
    /** The verslagsoorten available for the selected year. */
    availableVerslagsoorten: FilterOption[];
    selectedVerslagsoort: Key | null;
    onVerslagsoortChange: (key: Key | null) => void;
    selectedJaar: Key | null;
    onJaarChange: (key: Key | null) => void;
    reservemutaties: boolean;
    onReservemutatiesChange: (value: boolean) => void;

    reset: () => void;

    /**
     * Commits a referentiegroep straight to the URL.
     *
     * Used by the dedicated Referentiegroep page, which keeps its own working selection until
     * the user presses that page's Toepassen button.
     */
    applyReferentiegroepen: (keys: Selection, terugNaar?: string) => void;
}

const FiltersContext = createContext<FiltersContextValue | undefined>(undefined);

const toSelection = (value?: string): Selection => (value === ALLE_SELECTIE ? "all" : value === GEEN_SELECTIE ? new Set<Key>() : new Set(parseCodes(value)));

/**
 * What `navigate` is here: a writer of this route's search params, and nothing else.
 *
 * The router cannot type it for us. Both calls below pass `search` without a `to`, which means
 * "stay where you are and rewrite the query string" — but with no `to` and no `from` the router
 * has no route to resolve the search schema against and types the option as `never`. That is the
 * same bind `useSearch({ strict: false })` above is in, and for the same reason: this provider is
 * mounted once in /_layout and runs on every page under it, so it belongs to no single route.
 *
 * Naming a route with `useNavigate({ from })` does not fix it and must not be used here. `from`
 * is what a `to`-less navigate resolves its *destination* from — see buildLocation in
 * router-core, where `nextTo` falls back to `from` when `to` is absent — so `from: "/"` type-
 * checks and then silently sends anyone who applies a filter on /baten back to the dashboard.
 * "/_layout" is not accepted at all, being a pathless route with no fullPath of its own.
 *
 * So: one cast, at the boundary, against the schema /_layout really does declare
 * (validateSearch: validateFiltersSearch). The alternative is `as any` at both call sites, which
 * would type the patches as unknown rather than as FiltersSearch.
 */
type SearchNavigate = (opts: { to?: string; search: FiltersSearch | ((prev: FiltersSearch) => FiltersSearch); replace?: boolean }) => void;

export const FiltersProvider = ({ children }: { children: ReactNode }) => {
    const search = useSearch({ strict: false }) as FiltersSearch;
    const navigate = useNavigate() as unknown as SearchNavigate;

    // `replace` keeps the back button meaningful: it steps between pages, not between every
    // filter selection. Search text stays inside the select components and never reaches here.
    const patchSearch = useCallback(
        (patch: Partial<FiltersSearch>) => {
            navigate({ search: (prev: FiltersSearch) => ({ ...prev, ...patch }), replace: true });
        },
        [navigate],
    );

    const { gemeente, referentie, inwoner, verslagsoort, jaar, reserve } = search;
    // Neither sentinel names codes, so neither has anything to prune — see the pruning pass.
    const isSentinelReferentie = isSentinelSelectie(referentie);
    const referentieCodes = useMemo(() => (isSentinelReferentie ? [] : parseCodes(referentie)), [isSentinelReferentie, referentie]);
    const isSentinelInwoner = isSentinelSelectie(inwoner);
    const inwonerCodes = useMemo(() => (isSentinelInwoner ? [] : parseCodes(inwoner)), [isSentinelInwoner, inwoner]);

    // Keep the group identity stable when another filter changes, so the reference-group
    // page does not reset its unapplied selection when the user chooses a gemeente.
    const appliedReferentiegroepen = useMemo(() => toSelection(referentie), [referentie]);

    const applied = useMemo<AppliedFilters>(
        () => ({
            gemeente: gemeente ?? null,
            referentiegroepen: appliedReferentiegroepen,
            inwonergroepen: toSelection(inwoner),
            verslagsoort: verslagsoort ?? null,
            jaar: jaar ?? null,
            reservemutaties: resolveReserve(reserve),
        }),
        [gemeente, appliedReferentiegroepen, inwoner, verslagsoort, jaar, reserve],
    );

    // Refetches whenever the applied year changes: the gemeente list shrinks over time
    // (388 in 2017, 342 today) and the newest year may not have a Jaarrekening yet.
    //
    // Keyed by year and cached, so stepping back to a year already visited answers from memory.
    // That matters more here than it looks: this request gates every chart on the page (see
    // isReady below), so a year change used to mean two round trips in series before a single
    // figure could be drawn. Now only a year never opened before pays for the first of them.
    const optionsQuery = useQuery({
        queryKey: ["filter-options", jaar ?? null],
        queryFn: ({ signal }) => fetchFilterOptions(jaar ?? null, signal),
        // Deliberately no placeholderData: it would flip the query to "success" before the
        // options existed, and isReady below reads isLoading to decide whether the charts may
        // query yet — they would all fire against an empty gemeente list.
    });

    // The empty set of options is what the sidebar renders while loading, and what the
    // corrections pass prunes against on a failure — never undefined.
    const options = optionsQuery.isError ? EMPTY_OPTIONS : (optionsQuery.data ?? EMPTY_OPTIONS);
    const isLoading = optionsQuery.isPending;
    const error = optionsQuery.isError ? "Filters konden niet worden geladen" : null;

    // Everything that has to be true of the URL before a page may query with it: the defaults
    // that make the dashboard open on a complete view, and the pruning of selections that are
    // meaningless for the applied year — a gemeente may have been merged away, and Jaarrekening
    // does not exist for the current year.
    //
    // Derived rather than computed inside the effect that applies it, because two questions are
    // being asked of the same rules and only one of them is "change the URL". The pages need to
    // know whether the URL is *already* right — see isReady — and an effect that has not run yet
    // cannot tell them.
    //
    // The defaults live here, recomputed every render, rather than in a first-render effect of
    // their own. They used to have one, and it raced this pass: two navigate() calls, each built
    // from the router's last *committed* location, so whenever /filters/ answered before the
    // router committed the defaults, this pass overwrote them — and the effect, being one-shot,
    // never put them back. The dashboard then sat there with empty selects, sometimes. Derived,
    // a lost patch is simply recomputed and reissued on the next render.
    const corrections = useMemo<Partial<FiltersSearch>>(() => {
        const patch: Partial<FiltersSearch> = {};

        // Absent means "not chosen yet" and takes the default; the "geen" sentinel means the
        // user emptied the select and must stay empty. That distinction is the whole reason
        // an empty multi-select is serialised rather than dropped — see GEEN_SELECTIE.
        if (gemeente === undefined) patch.gemeente = DEFAULT_SEARCH.gemeente;
        if (referentie === undefined) patch.referentie = DEFAULT_SEARCH.referentie;
        if (inwoner === undefined) patch.inwoner = DEFAULT_SEARCH.inwoner;
        if (reserve === undefined) patch.reserve = DEFAULT_SEARCH.reserve;

        // Every branch guards on having options to prune *against*. Options that failed to load
        // are an empty list, not a verdict that every selection is invalid — without the guard a
        // /filters/ hiccup silently strips the gemeente out of the user's URL. The verslagsoort
        // branch has always guarded this way; the other three now agree with it.
        // The newest year the data carries, which only /filters/ can name — see DEFAULT_SEARCH.
        // `options.jaar` is the backend's own resolution of what was asked for, so a request
        // that named no year or an unavailable year comes back carrying the newest one.
        if (options.jaar !== null && jaar !== options.jaar) {
            patch.jaar = options.jaar;
        }

        if (options.gemeenten.length > 0 && gemeente && !options.gemeenten.some((option) => option.id === gemeente)) {
            patch.gemeente = undefined;
        }
        // Verslagsoort codes carry their year ("2024X000"), so the selection has to be
        // re-pointed at the new year rather than simply dropped. Missing or unavailable
        // falls back to Begroting, which every year has.
        const heeftVerslagsoort = verslagsoort && options.verslagsoorten.some((option) => option.id === verslagsoort);
        if (!heeftVerslagsoort) {
            const herpunt = herpuntVerslagsoort(options.verslagsoorten, verslagsoort);
            if (herpunt) patch.verslagsoort = herpunt;
        }

        // Neither sentinel names codes — "alle" follows the year and "geen" is empty on
        // purpose — so there is nothing to prune. Pruning every code away lands on "geen"
        // rather than on nothing, which the defaults above would read as unset and refill.
        if (!isSentinelReferentie && options.gemeenten.length > 0) {
            const validCodes = referentieCodes.filter((code) => options.gemeenten.some((option) => option.id === code));
            if (validCodes.length !== referentieCodes.length) {
                patch.referentie = serializeCodes(validCodes) ?? GEEN_SELECTIE;
            }
        }

        if (!isSentinelInwoner && options.inwonergroepen.length > 0) {
            const validGroepen = inwonerCodes.filter((id) => options.inwonergroepen.some((option) => option.id === id));
            if (validGroepen.length !== inwonerCodes.length) {
                patch.inwoner = serializeCodes(validGroepen) ?? GEEN_SELECTIE;
            }
        }

        return patch;
    }, [options, gemeente, jaar, verslagsoort, reserve, inwonerCodes, referentieCodes, isSentinelReferentie, isSentinelInwoner]);

    useEffect(() => {
        if (isLoading) return;
        if (Object.keys(corrections).length > 0) {
            patchSearch(corrections);
        }
    }, [isLoading, corrections, patchSearch]);

    /**
     * True once the filters describe a view worth querying: the options are in, and the
     * corrections pass has nothing left to correct. The chart hooks gate their fetches on this.
     *
     * Without it a cold load fires the same heavy request several times over and throws all but
     * the last away: against an empty URL, again once /filters/ names the gemeenten, and again
     * once the corrections pass pins the defaults, the jaar and the verslagsoort — the last two
     * of which DEFAULT_SEARCH omits on purpose, so they are always the last to arrive and the
     * first correct request. Each is a full year-loop over Iv3Summary.
     *
     * Deliberately not gated on `error`: options that never load never converge, and a chart
     * waiting on them would spin for ever. On a failure the corrections pass has nothing to prune
     * against (the guards above), so this goes true and the pages query with what the URL holds —
     * ChartView's own fallbacks pin the rest. The sidebar still shows the error.
     */
    const isReady = !isLoading && Object.keys(corrections).length === 0;

    const reset = useCallback(() => {
        navigate({ search: { ...DEFAULT_SEARCH }, replace: true });
    }, [navigate]);

    const applyReferentiegroepen = useCallback(
        (keys: Selection, terugNaar?: string) => {
            const referentie = serializeSelectie(keys, options.gemeenten);
            if (terugNaar) {
                navigate({ to: terugNaar, search: (prev: FiltersSearch) => ({ ...prev, referentie, terug: undefined }), replace: true });
                return;
            }
            patchSearch({ referentie });
        },
        [navigate, patchSearch, options.gemeenten],
    );

    // The all-years map lets a year selection and its compatible verslagsoort be committed in
    // one URL update. The per-year request then replaces this list with that year's own options.
    const availableVerslagsoorten = useMemo(
        () => options.verslagsoortenPerJaar[String(jaar)] ?? options.verslagsoorten,
        [options.verslagsoortenPerJaar, options.verslagsoorten, jaar],
    );

    // Memoized because everything under this provider consumes it, charts included.
    const value = useMemo<FiltersContextValue>(
        () => ({
            options,
            isLoading,
            error,
            isReady,
            applied,

            selectedGemeente: gemeente ?? DEFAULT_SEARCH.gemeente ?? null,
            // React Aria may report null while the user replaces the input text. Only an actual
            // option selection is a filter change; searching must leave the current URL alone.
            onGemeenteChange: (key) => {
                if (key !== null) patchSearch({ gemeente: String(key) });
            },

            selectedReferentiegroepen: toSelection(referentie ?? DEFAULT_SEARCH.referentie),
            // The "Alles" row hands back every gemeente as an explicit set; serializeSelectie
            // collapses that back into the sentinel so it round-trips as `referentie=alle`.
            onReferentiegroepenChange: (keys) => patchSearch({ referentie: serializeSelectie(keys, options.gemeenten) }),

            selectedInwonergroepen: toSelection(inwoner ?? DEFAULT_SEARCH.inwoner),
            onInwonergroepenChange: (keys) => patchSearch({ inwoner: serializeSelectie(keys, options.inwonergroepen) }),

            availableVerslagsoorten,
            selectedVerslagsoort: verslagsoort ?? null,
            onVerslagsoortChange: (key) => {
                if (key !== null) patchSearch({ verslagsoort: String(key) });
            },

            selectedJaar: jaar ? String(jaar) : null,
            // Move the verslagsoort with the year in the same URL update so chart queries never
            // observe a report code belonging to the previous year.
            onJaarChange: (key) => {
                if (key === null) return;
                const nieuwJaar = Number(key);
                const opties = options.verslagsoortenPerJaar[String(nieuwJaar)] ?? [];
                patchSearch({
                    jaar: nieuwJaar,
                    verslagsoort: herpuntVerslagsoort(opties, verslagsoort) ?? verslagsoort,
                });
            },

            reservemutaties: resolveReserve(reserve),
            // Written out either way: with the default on, dropping `false` from the URL would
            // read back as "not chosen yet" and switch the toggle on again after a reload.
            onReservemutatiesChange: (checked) => patchSearch({ reserve: checked }),

            reset,
            applyReferentiegroepen,
        }),
        [
            options,
            isLoading,
            error,
            isReady,
            applied,
            gemeente,
            referentie,
            inwoner,
            verslagsoort,
            jaar,
            reserve,
            availableVerslagsoorten,
            patchSearch,
            reset,
            applyReferentiegroepen,
        ],
    );

    return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
};

export const useFilters = () => {
    const context = useContext(FiltersContext);
    if (!context) {
        throw new Error("useFilters must be used within a FiltersProvider");
    }
    return context;
};
