/**
 * The shape classes for the referentiegroep map, keyed by bare CBS prv_code — the same id
 * `options.provincies[].id` carries, so the two join directly.
 *
 * Written out as literal class strings on purpose: Tailwind v4 scans source for class names
 * it can see, so `fill-utility-${scale}-200` would compile to no CSS at all.
 *
 * The scales are Untitled UI's utility colours, which theme.css re-points under dark mode —
 * `-200` is always "pale backdrop for this theme" and `-500` always "saturated", so both
 * themes work without a second table. `slate` is deliberately unused: it is the scale
 * closest to neutral, and neutral is what marks a gemeente the filters have ruled out.
 *
 * Twelve categorical hues is past what anyone can reliably tell apart, and more so for the
 * ~8% of men with a colour-vision deficiency. So the province colour is orientation only —
 * it never carries meaning. What the page is actually about, whether a gemeente is in the
 * referentiegroep, is encoded as saturation *and* a thicker stroke *and* the tooltip *and*
 * the checkboxes in the Referentiegroep list. Hues are assigned so that provinces which
 * touch are always far apart in hue; two similar hues at opposite ends of the country are
 * not a problem anyone can see.
 */

/** Unselected, and inside the current filters. */
export const PROVINCIE_BASIS: Readonly<Record<string, string>> = {
    "20": "fill-utility-blue-200 stroke-utility-blue-400 hover:fill-utility-blue-300", // Groningen
    "21": "fill-utility-emerald-200 stroke-utility-emerald-400 hover:fill-utility-emerald-300", // Fryslân
    "22": "fill-utility-orange-200 stroke-utility-orange-400 hover:fill-utility-orange-300", // Drenthe
    "23": "fill-utility-purple-200 stroke-utility-purple-400 hover:fill-utility-purple-300", // Overijssel
    "24": "fill-utility-yellow-200 stroke-utility-yellow-400 hover:fill-utility-yellow-300", // Flevoland
    "25": "fill-utility-sky-200 stroke-utility-sky-400 hover:fill-utility-sky-300", // Gelderland
    "26": "fill-utility-red-200 stroke-utility-red-400 hover:fill-utility-red-300", // Utrecht
    "27": "fill-utility-indigo-200 stroke-utility-indigo-400 hover:fill-utility-indigo-300", // Noord-Holland
    "28": "fill-utility-green-200 stroke-utility-green-400 hover:fill-utility-green-300", // Zuid-Holland
    "29": "fill-utility-fuchsia-200 stroke-utility-fuchsia-400 hover:fill-utility-fuchsia-300", // Zeeland
    "30": "fill-utility-amber-200 stroke-utility-amber-400 hover:fill-utility-amber-300", // Noord-Brabant
    "31": "fill-utility-pink-200 stroke-utility-pink-400 hover:fill-utility-pink-300", // Limburg
};

/** In the referentiegroep: the same hue, saturated, with a heavier stroke. */
export const PROVINCIE_GESELECTEERD: Readonly<Record<string, string>> = {
    "20": "fill-utility-blue-500 stroke-utility-blue-700 hover:fill-utility-blue-600",
    "21": "fill-utility-emerald-500 stroke-utility-emerald-700 hover:fill-utility-emerald-600",
    "22": "fill-utility-orange-500 stroke-utility-orange-700 hover:fill-utility-orange-600",
    "23": "fill-utility-purple-500 stroke-utility-purple-700 hover:fill-utility-purple-600",
    "24": "fill-utility-yellow-500 stroke-utility-yellow-700 hover:fill-utility-yellow-600",
    "25": "fill-utility-sky-500 stroke-utility-sky-700 hover:fill-utility-sky-600",
    "26": "fill-utility-red-500 stroke-utility-red-700 hover:fill-utility-red-600",
    "27": "fill-utility-indigo-500 stroke-utility-indigo-700 hover:fill-utility-indigo-600",
    "28": "fill-utility-green-500 stroke-utility-green-700 hover:fill-utility-green-600",
    "29": "fill-utility-fuchsia-500 stroke-utility-fuchsia-700 hover:fill-utility-fuchsia-600",
    "30": "fill-utility-amber-500 stroke-utility-amber-700 hover:fill-utility-amber-600",
    "31": "fill-utility-pink-500 stroke-utility-pink-700 hover:fill-utility-pink-600",
};

/** A gemeente with no province in the data — nullable in the warehouse, so it can happen. */
export const ZONDER_PROVINCIE = "fill-utility-slate-200 stroke-utility-slate-400 hover:fill-utility-slate-300";
export const ZONDER_PROVINCIE_GESELECTEERD = "fill-utility-slate-500 stroke-utility-slate-700 hover:fill-utility-slate-600";

/**
 * Ruled out by the page filters. The filters are a lens rather than a destructive edit, so a
 * gemeente that is selected *and* filtered out stays visibly darker — its membership is
 * still real, just out of view.
 *
 * `pointer-events-none` is what makes these unclickable: the event then resolves past the
 * path to the wrapper, where the delegated handler finds no gemeente code and does nothing.
 */
export const BUITEN_FILTER = "fill-utility-neutral-100 stroke-utility-neutral-300 pointer-events-none";
export const BUITEN_FILTER_GESELECTEERD = "fill-utility-neutral-400 stroke-utility-neutral-600 pointer-events-none";

/** A 2021 outline with no gemeente in the selected year — only reachable before 2021. */
export const ZONDER_GEMEENTE = "fill-utility-neutral-50 stroke-utility-neutral-200 pointer-events-none";
