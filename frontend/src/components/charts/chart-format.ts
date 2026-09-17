/**
 * How every figure on a chart is printed.
 *
 * Two readings of the same number live here, and the split is the point. `formatValue` is the
 * *printed* one — an axis tick, a bar segment's label, the total at the end of a bar, a donut's
 * leader label — and it rounds to whole euros, because that is what those places have room for
 * and what the report prints. `formatTooltipValue` is the *hovered* one, and it does not round:
 * a reader hovers a figure precisely when the printed one is not enough.
 *
 * The API carries cents to make the second possible (see `_round` in backend/iv3/queries.py),
 * which is why the rounding has to happen here and nowhere else.
 */

/**
 * How a chart's figures read: euros per inhabitant, whole euros rounded off, a percentage,
 * or a bare index number (a year-on-year index against inflation carries no unit at all).
 */
export type ValueFormat = "euro" | "euro-compact" | "percent" | "index";

/**
 * Absolute bedragen run to ten digits, which no axis or bar segment can hold: a gemeente's
 * begroting reads as "€ 80,5 mln." and the largest as "€ 6,5 mld.".
 */
const euroCompact = new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
});

/**
 * Tenths of a million: the finest these figures are read to, and so the step they are
 * rounded to before printing.
 *
 * Rounding only the printed digits would leave the Resultaat card contradicting itself —
 * inkomsten and uitgaven a rounding apart both read "€ 80,5 mln.", while the saldo between
 * them kept its own scale and read "€ 1K" against them. Anything under a tenth of a million
 * is nothing at this size, and now says so.
 */
const EURO_COMPACT_STAP = 100_000;

/**
 * Whole euros, half up, and on a .5 toward +∞ — the rule `_round` follows in
 * backend/iv3/queries.py, so a figure printed here rounds the way the report rounds it.
 * Intl's own rounding will not do: `maximumFractionDigits` rounds half *away from zero*, so
 * it prints −120,5 as "−121" where the backend reads −120.
 *
 * The `|| 0` is not a NaN guard but a −0 guard: Math.round(−0,4) is −0, and Intl prints that
 * as "-0". A saldo a few cents under zero would otherwise read "€ -0".
 */
const heleEuros = (value: number) => Math.round(value) || 0;

/** A figure as the chart itself prints it: rounded to what an axis or a label has room for. */
export const formatValue = (value: unknown, format: ValueFormat): string => {
    const number = Number(value) || 0;
    if (format === "percent") {
        return `${number.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
    }
    if (format === "index") {
        return number.toLocaleString("nl-NL");
    }
    if (format === "euro-compact") {
        return euroCompact.format(heleEuros(number / EURO_COMPACT_STAP) * EURO_COMPACT_STAP);
    }
    return `€ ${heleEuros(number).toLocaleString("nl-NL")}`;
};

/**
 * A figure as it reads in a tooltip: the exact one, where the chart prints a rounded one.
 *
 * `euro-compact` deliberately falls through to the full amount rather than to another
 * abbreviation — "€ 80,5 mln." is a reading form for an axis that cannot hold ten digits, and
 * a tooltip is where those digits go.
 *
 * Always two decimals rather than cents-only-where-there-are-cents: "€ 510,00" says the cents
 * are genuinely zero, where "€ 510" leaves the reader wondering whether it rounded again.
 * `percent` and `index` already print every digit they carry, so they read the same either way.
 */
export const formatTooltipValue = (value: unknown, format: ValueFormat): string => {
    const number = Number(value) || 0;
    if (format === "percent" || format === "index") {
        return formatValue(number, format);
    }
    return `€ ${number.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * A part as a share of its whole, to two decimals — the precision a reader hovers for.
 *
 * Null, rather than "0%", wherever the share is not a share; the caller then drops the
 * parenthetical entirely instead of printing an empty one:
 *
 *  - a total of zero or less is nothing to be a part of. A saldo nets to a negative total, and
 *    "−240% of −€ 120" is arithmetic, not information;
 *  - a negative part of a positive total gives a negative percentage, which reads as a *small*
 *    share rather than an opposite-signed one — worse than saying nothing.
 */
export const formatShare = (value: number, total: number): string | null => {
    if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0 || value < 0) {
        return null;
    }
    return `${((value / total) * 100).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};
