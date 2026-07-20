import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { Key, Selection } from "react-aria-components";
import { type FilterOptions, fetchFilterOptions } from "../api";
import { ALLE_SELECTIE, type FiltersSearch, parseCodes, serializeCodes, serializeSelectie } from "../search";

const EMPTY_OPTIONS: FilterOptions = {
    jaren: [],
    jaar: null,
    gemeenten: [],
    verslagsoorten: [],
    inwonergroepen: [],
    provincies: [],
};

/** Last three characters of a Begroting code, e.g. "2024X000" — the default verslagsoort. */
const BEGROTING_SUFFIX = "000";

/**
 * The view the dashboard opens on, and the one Reset returns to. GM1680 is Aa en Hunze.
 *
 * Jaar and verslagsoort are both deliberately absent, for the same reason: neither can be
 * named ahead of the data. A verslagsoort code carries its year ("2024X000"), and the newest
 * year moves whenever CBS publishes — a literal here is a value that silently goes stale, and
 * did: the dashboard opened on 2024 for a year after 2025 and 2026 had landed in the fixture.
 * The pruning pass below resolves an unset jaar to the newest the backend reports, and an
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
     * Whether `applied` is settled enough to query with: the options are loaded and the pruning
     * pass has nothing left to correct. Every chart hook gates its fetch on this — see the
     * comment on isReady in FiltersProvider for what it costs not to.
     */
    isReady: boolean;

    /** What the pages query with — only changes when the user presses "Toepassen". */
    applied: AppliedFilters;

    /**
     * The pending selections shown in the sidebar. Editing these does not touch the URL
     * or refetch anything until `apply()` is called.
     */
    selectedGemeente: Key | null;
    onGemeenteChange: (key: Key | null) => void;
    selectedReferentiegroepen: Selection;
    onReferentiegroepenChange: (keys: Selection) => void;
    /** Each selected size class is drawn as a line of its own on the charts. */
    selectedInwonergroepen: Selection;
    onInwonergroepenChange: (keys: Selection) => void;
    selectedVerslagsoort: Key | null;
    onVerslagsoortChange: (key: Key | null) => void;
    selectedJaar: Key | null;
    onJaarChange: (key: Key | null) => void;
    reservemutaties: boolean;
    onReservemutatiesChange: (value: boolean) => void;

    /** True when the pending selections differ from the applied ones. */
    hasPendingChanges: boolean;
    /** Commits the pending selections to the URL, which is what makes the pages refetch. */
    apply: () => void;
    reset: () => void;

    /**
     * Commits a referentiegroep straight to the URL, bypassing the draft entirely.
     *
     * For a page that composes a selection of its own and applies it with its own button. Such
     * a page must not write to the draft as it goes: the draft is what the sidebar *shows*, so
     * every click would move the sidebar's dropdown under the user long before they asked for
     * it. It writes here instead, once, when they press the button — and the draft then falls
     * in line with the URL like it does after any other apply.
     */
    applyReferentiegroepen: (keys: Selection) => void;
}

const FiltersContext = createContext<FiltersContextValue | undefined>(undefined);

/** Order-independent comparison of the six filter keys. */
const isSameSearch = (a: FiltersSearch, b: FiltersSearch) =>
    a.gemeente === b.gemeente &&
    a.referentie === b.referentie &&
    a.inwoner === b.inwoner &&
    a.verslagsoort === b.verslagsoort &&
    a.jaar === b.jaar &&
    resolveReserve(a.reserve) === resolveReserve(b.reserve);

const toSelection = (value?: string): Selection => (value === ALLE_SELECTIE ? "all" : new Set(parseCodes(value)));

export const FiltersProvider = ({ children }: { children: ReactNode }) => {
    const search = useSearch({ strict: false }) as FiltersSearch;
    const navigate = useNavigate();

    const [options, setOptions] = useState<FilterOptions>(EMPTY_OPTIONS);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // The URL holds the *applied* filters; `draft` holds what the sidebar shows. The two
    // only meet when the user presses "Toepassen" — that is what keeps the charts from
    // refetching on every dropdown along the way.
    const [draft, setDraft] = useState<FiltersSearch>(() => ({ ...DEFAULT_SEARCH, ...search }));

    // `replace` keeps the back button meaningful: it steps between pages, not between
    // every set of filters the user applied on the way.
    const patchSearch = useCallback(
        (patch: Partial<FiltersSearch>) => {
            navigate({ search: (prev: FiltersSearch) => ({ ...prev, ...patch }), replace: true });
        },
        [navigate],
    );

    const { gemeente, referentie, inwoner, verslagsoort, jaar, reserve } = search;
    const isAlleReferentie = referentie === ALLE_SELECTIE;
    const referentieCodes = useMemo(
        () => (isAlleReferentie ? [] : parseCodes(referentie)),
        [isAlleReferentie, referentie],
    );
    const isAlleInwoner = inwoner === ALLE_SELECTIE;
    const inwonerCodes = useMemo(() => (isAlleInwoner ? [] : parseCodes(inwoner)), [isAlleInwoner, inwoner]);

    const applied = useMemo<AppliedFilters>(
        () => ({
            gemeente: gemeente ?? null,
            referentiegroepen: toSelection(referentie),
            inwonergroepen: toSelection(inwoner),
            verslagsoort: verslagsoort ?? null,
            jaar: jaar ?? null,
            reservemutaties: resolveReserve(reserve),
        }),
        [gemeente, referentie, inwoner, verslagsoort, jaar, reserve],
    );

    // The dashboard opens on a complete view rather than empty selects. Applied once: a
    // filter the user deliberately clears must stay cleared, not snap back to its default.
    const defaultsApplied = useRef(false);
    useEffect(() => {
        if (defaultsApplied.current) return;
        defaultsApplied.current = true;

        const patch: Partial<FiltersSearch> = {};
        if (gemeente === undefined) patch.gemeente = DEFAULT_SEARCH.gemeente;
        if (referentie === undefined) patch.referentie = DEFAULT_SEARCH.referentie;
        if (inwoner === undefined) patch.inwoner = DEFAULT_SEARCH.inwoner;
        if (reserve === undefined) patch.reserve = DEFAULT_SEARCH.reserve;

        if (Object.keys(patch).length > 0) {
            patchSearch(patch);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- first render only
    }, []);

    // The applied filters are the source of truth: pull the draft back in line whenever
    // they change under it (Toepassen, Reset, the pruning pass below, the back button).
    useEffect(() => {
        setDraft((current) => (isSameSearch(current, search) ? current : { ...search }));
    }, [search]);

    // Refetches whenever the applied year changes: the gemeente list shrinks over time
    // (388 in 2017, 342 today) and the newest year may not have a Jaarrekening yet.
    useEffect(() => {
        let isMounted = true;

        const loadOptions = async () => {
            setIsLoading(true);
            try {
                const next = await fetchFilterOptions(jaar ?? null);
                if (!isMounted) return;
                setOptions(next);
                setError(null);
            } catch {
                if (!isMounted) return;
                setOptions(EMPTY_OPTIONS);
                setError("Filters konden niet worden geladen");
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadOptions();
        return () => {
            isMounted = false;
        };
    }, [jaar]);

    // A selection made for one year can be meaningless in another — a gemeente may have
    // been merged away, and Jaarrekening does not exist for the current year. Correct the
    // URL rather than letting the pages query a combination that has no data.
    //
    // Derived rather than computed inside the effect that applies it, because two questions are
    // being asked of the same rules and only one of them is "change the URL". The pages need to
    // know whether the URL is *already* right — see isReady — and an effect that has not run yet
    // cannot tell them.
    const pruning = useMemo<Partial<FiltersSearch>>(() => {
        const patch: Partial<FiltersSearch> = {};

        // Every branch guards on having options to prune *against*. Options that failed to load
        // are an empty list, not a verdict that every selection is invalid — without the guard a
        // /filters/ hiccup silently strips the gemeente out of the user's URL. The verslagsoort
        // branch has always guarded this way; the other three now agree with it.
        // The newest year the data carries, which only /filters/ can name — see DEFAULT_SEARCH.
        // `options.jaar` is the backend's own resolution of what was asked for, so a request
        // that named no year comes back carrying the newest one rather than null.
        if (jaar === undefined && options.jaar !== null) {
            patch.jaar = options.jaar;
        }

        if (options.gemeenten.length > 0 && gemeente && !options.gemeenten.some((option) => option.id === gemeente)) {
            patch.gemeente = undefined;
        }
        // Verslagsoort codes carry their year ("2024X000"), so the selection has to be
        // re-pointed at the new year rather than simply dropped. Missing or unavailable
        // falls back to Begroting, which every year has.
        const heeftVerslagsoort = verslagsoort && options.verslagsoorten.some((option) => option.id === verslagsoort);
        if (!heeftVerslagsoort && options.verslagsoorten.length > 0) {
            const zelfdeSoort = verslagsoort
                ? options.verslagsoorten.find((option) => option.id.endsWith(verslagsoort.slice(-3)))
                : undefined;
            const begroting = options.verslagsoorten.find((option) => option.id.endsWith(BEGROTING_SUFFIX));
            patch.verslagsoort = (zelfdeSoort ?? begroting ?? options.verslagsoorten[0]).id;
        }

        // "alle" follows the year rather than naming codes, so there is nothing to prune.
        if (!isAlleReferentie && options.gemeenten.length > 0) {
            const validCodes = referentieCodes.filter((code) => options.gemeenten.some((option) => option.id === code));
            if (validCodes.length !== referentieCodes.length) {
                patch.referentie = serializeCodes(validCodes);
            }
        }

        if (!isAlleInwoner && options.inwonergroepen.length > 0) {
            const validGroepen = inwonerCodes.filter((id) => options.inwonergroepen.some((option) => option.id === id));
            if (validGroepen.length !== inwonerCodes.length) {
                patch.inwoner = serializeCodes(validGroepen);
            }
        }

        return patch;
    }, [options, gemeente, jaar, verslagsoort, inwonerCodes, referentieCodes, isAlleReferentie, isAlleInwoner]);

    useEffect(() => {
        if (isLoading) return;
        if (Object.keys(pruning).length > 0) {
            patchSearch(pruning);
        }
    }, [isLoading, pruning, patchSearch]);

    /**
     * True once the filters describe a view worth querying: the options are in, and the pruning
     * pass has nothing left to correct. The chart hooks gate their fetches on this.
     *
     * Without it a cold load fires the same heavy request up to four times and throws three away:
     * against an empty URL, again once the defaults land, again once /filters/ names the
     * gemeenten, and again once the pruning pass finally pins the jaar and the verslagsoort —
     * which DEFAULT_SEARCH omits on purpose, so they are always the last to arrive and the
     * first correct request. Each is a full year-loop over Iv3Summary.
     *
     * Deliberately not gated on `error`: options that never load never converge, and a chart
     * waiting on them would spin for ever. On a failure the pruning pass has nothing to prune
     * against (the guards above), so this goes true and the pages query with what the URL holds —
     * ChartView's own fallbacks pin the rest. The sidebar still shows the error.
     */
    const isReady = !isLoading && Object.keys(pruning).length === 0;

    const apply = useCallback(() => {
        patchSearch(draft);
    }, [draft, patchSearch]);

    const reset = useCallback(() => {
        navigate({ search: { ...DEFAULT_SEARCH }, replace: true });
    }, [navigate]);

    const applyReferentiegroepen = useCallback(
        (keys: Selection) => patchSearch({ referentie: serializeSelectie(keys, options.gemeenten) }),
        [patchSearch, options.gemeenten],
    );

    const setDraftValue = useCallback((patch: Partial<FiltersSearch>) => {
        setDraft((current) => ({ ...current, ...patch }));
    }, []);

    const value: FiltersContextValue = {
        options,
        isLoading,
        error,
        isReady,
        applied,

        selectedGemeente: draft.gemeente ?? null,
        onGemeenteChange: (key) => setDraftValue({ gemeente: key ? String(key) : undefined }),

        selectedReferentiegroepen: toSelection(draft.referentie),
        // The "Alles" row hands back every gemeente as an explicit set; serializeSelectie
        // collapses that back into the sentinel so it round-trips as `referentie=alle`.
        onReferentiegroepenChange: (keys) => setDraftValue({ referentie: serializeSelectie(keys, options.gemeenten) }),

        selectedInwonergroepen: toSelection(draft.inwoner),
        onInwonergroepenChange: (keys) => setDraftValue({ inwoner: serializeSelectie(keys, options.inwonergroepen) }),

        selectedVerslagsoort: draft.verslagsoort ?? null,
        onVerslagsoortChange: (key) => setDraftValue({ verslagsoort: key ? String(key) : undefined }),

        selectedJaar: draft.jaar ? String(draft.jaar) : null,
        onJaarChange: (key) => setDraftValue({ jaar: key ? Number(key) : undefined }),

        reservemutaties: resolveReserve(draft.reserve),
        // Written out either way: with the default on, dropping `false` from the URL would
        // read back as "not chosen yet" and switch the toggle on again after a reload.
        onReservemutatiesChange: (checked) => setDraftValue({ reserve: checked }),

        hasPendingChanges: !isSameSearch(draft, search),
        apply,
        reset,
        applyReferentiegroepen,
    };

    return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
};

export const useFilters = () => {
    const context = useContext(FiltersContext);
    if (!context) {
        throw new Error("useFilters must be used within a FiltersProvider");
    }
    return context;
};
