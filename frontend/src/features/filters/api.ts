export interface FilterOption {
    id: string;
    label: string;
}

/**
 * A gemeente carries what the referentiegroep page needs to colour its map by province and
 * narrow it by population.
 *
 * `provincie` and `inwoners` are both nullable: prv_code is nullable in the warehouse, and
 * a gemeente can be missing from the inwoners table for a given year.
 */
export interface GemeenteOption extends FilterOption {
    /** Bare CBS province code as a string ("27"), matching a `provincies` option id. */
    provincie: string | null;
    inwoners: number | null;
    /**
     * Every size class this gemeente falls in, by `inwonergroepen` option id. A list, not a
     * single id: G4 overlaps "> 100.000", so the four big cities are in two at once. The
     * bounds themselves stay in the backend, which is why this arrives resolved.
     */
    inwonergroepen: string[];
}

export interface FilterOptions {
    /** Every year present in the IV3 data, newest first. */
    jaren: number[];
    /** The year these options describe. */
    jaar: number | null;
    gemeenten: GemeenteOption[];
    /** The fixed population size classes — "< 25.000" through "G4". */
    inwonergroepen: FilterOption[];
    /** The provinces that have a municipality in this year. */
    provincies: FilterOption[];
    verslagsoorten: FilterOption[];
}

/**
 * Gemeenten and verslagsoorten depend on the year — municipalities merge, and a year
 * only carries a Jaarrekening once it has been filed — so this is refetched per year.
 */
export async function fetchFilterOptions(jaar?: number | null): Promise<FilterOptions> {
    const query = jaar ? `?jaar=${jaar}` : "";
    const response = await fetch(`/api/iv3/filters/${query}`, { credentials: "include" });

    if (!response.ok) {
        throw new Error("Filters konden niet worden geladen");
    }

    return response.json();
}
