/**
 * Reconciles the 2021 outlines onto the gemeente-indeling of a later year.
 *
 * The map is drawn in the 2021 indeling (see gemeente-shapes.ts). Every merger since is a
 * union of whole 2021 gemeenten, so a later year can be drawn exactly: resolve each shape
 * to its surviving successor and concatenate the `d` of everything that lands on the same
 * code. The internal borders vanish and the successor's outline is correct to the pixel —
 * the same flattening the build script does for the multi-part island groups, safe for the
 * same reason (every subpath re-anchors with an absolute M).
 *
 * This only runs forwards. A year *before* 2021 would need a merger run backwards, which is
 * a split — Eemsdelta (GM1979) is one 2021 shape covering three 2019 gemeenten, and Haaren
 * (GM0788) was split across four. That geometry is not in the SVG and cannot be invented,
 * so pre-2021 years keep the unmatched shapes inert and say so on the page.
 */

/** A merged-away 2021 gemeente and the gemeente that absorbed it. */
export const OPVOLGER: Readonly<Record<string, string>> = {
    // 2022
    GM0370: "GM0439", // Beemster -> Purmerend
    GM0457: "GM0363", // Weesp -> Amsterdam
    GM0398: "GM1980", // Heerhugowaard -> Dijk en Waard
    GM0416: "GM1980", // Langedijk -> Dijk en Waard
    GM0756: "GM1982", // Boxmeer -> Land van Cuijk
    GM1684: "GM1982", // Cuijk -> Land van Cuijk
    GM0786: "GM1982", // Grave -> Land van Cuijk
    GM0815: "GM1982", // Mill en Sint Hubert -> Land van Cuijk
    GM1702: "GM1982", // Sint Anthonis -> Land van Cuijk
    GM0856: "GM1991", // Uden -> Maashorst
    GM1685: "GM1991", // Landerd -> Maashorst

    // 2023
    GM0501: "GM1992", // Brielle -> Voorne aan Zee
    GM0530: "GM1992", // Hellevoetsluis -> Voorne aan Zee
    GM0614: "GM1992", // Westvoorne -> Voorne aan Zee
};

/**
 * The code a 2021 shape should be drawn as, given the gemeenten a year actually has.
 *
 * A code that the year still carries stands for itself — checked first, so a gemeente that
 * merely shares a name with a merger source is never redirected. Otherwise the successor
 * chain is followed until it reaches a gemeente the year has. Returns null when nothing on
 * the chain exists in that year, which is the pre-2021 case.
 */
export const resolveGemeenteCode = (gmCode: string, bestaandeCodes: ReadonlySet<string>): string | null => {
    let code: string | undefined = gmCode;
    // Bounded by the table: 14 entries, so a cycle could only come from a bad edit.
    for (let stap = 0; code && stap <= Object.keys(OPVOLGER).length; stap++) {
        if (bestaandeCodes.has(code)) return code;
        code = OPVOLGER[code];
    }
    return null;
};
