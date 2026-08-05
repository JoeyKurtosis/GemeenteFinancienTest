import type { Cell, SheetData } from "write-excel-file/browser";
import type { ChartSeries, ValueFormat } from "@/components/charts/chart-card";
import type { FilterRegel } from "@/features/filters";

/**
 * A chart's figures as a spreadsheet, ready to be handed to `downloadChartSheet`.
 *
 * Kept separate from the writing so the shape can be built (and reasoned about) without pulling
 * the xlsx library into the bundle — see the dynamic import below.
 */
export interface ChartSheet {
    rows: SheetData;
    columns: { width: number }[];
    sheet: string;
}

/**
 * How a figure is printed in Excel.
 *
 * Numbers stay numbers — the format decides how they *read*, so a column of bedragen is still one
 * you can sum. The separators are Excel's own, so a Dutch install shows "€ 1.234" for the same
 * cell an English one shows as "€ 1,234".
 *
 * `percent` prints a literal "%" rather than using Excel's `0.00%`: these values are already on a
 * 0–100 scale, and the built-in percent format multiplies by 100 on top of that.
 *
 * `euro-compact` is a reading form of the screen ("€ 80,5 mln."), not of a rekenblad — a
 * spreadsheet gets the whole number.
 */
const EXCEL_FORMAT: Record<ValueFormat, string> = {
    euro: '"€" #,##0',
    "euro-compact": '"€" #,##0',
    percent: '0.00"%"',
    index: "#,##0.0",
};

/** Excel rejects these in a sheet name, and caps the name at 31 characters. */
const sheetName = (title: string) => title.replace(/[:\\/?*[\]]/g, " ").trim().slice(0, 31) || "Grafiek";

const slug = (value: string) =>
    value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

/** `aa-en-hunze-2024-uitgaven-per-jaar.xlsx` — what the figures are of, and what they describe. */
export function chartFileName(title: string, ...parts: (string | number | null | undefined)[]): string {
    const stukken = [...parts, title].map((deel) => (deel === null || deel === undefined ? "" : slug(String(deel)))).filter(Boolean);
    return `${stukken.join("-") || "grafiek"}.xlsx`;
}

/**
 * A cell holding one figure.
 *
 * A missing value stays empty rather than becoming 0. The two are not the same thing here: a
 * cohort with no filing in a given year has no figure, and a zero would be read as "spent
 * nothing".
 */
const bedragCel = (value: unknown, format: string): Cell => {
    if (value === null || value === undefined || value === "") return null;
    const getal = Number(value);
    return Number.isFinite(getal) ? { type: Number, value: getal, format } : null;
};

const kopCel = (label: string): Cell => ({ type: String, value: label, fontWeight: "bold" });

interface ChartSheetInput {
    title: string;
    data: Record<string, unknown>[];
    series: ChartSeries[];
    xAxisKey?: string;
    /** Names the first column. Falls back to the axis key's own name. */
    xAxisLabel?: string;
    valueFormat?: ValueFormat;
    /** See the note below on why this changes how the figures are printed. */
    normalize?: boolean;
    /** The measured total per row, printed in a trailing "Totaal" column. */
    totals?: number[];
    /** A closing row summing the columns — the donut pair's centre totals. */
    totalRow?: { label: string; values: (number | null | undefined)[] };
    /** The applied filters, printed above the table so the file still says what it describes. */
    context: FilterRegel[];
}

/**
 * A chart's data as a sheet: the title, the filters it was read under, then the figures.
 *
 * Everything comes from the props the chart card already holds — `data` is the rows and `series`
 * names the columns — so nothing is refetched and the sheet cannot disagree with what is drawn.
 */
export function buildChartSheet({
    title,
    data,
    series,
    xAxisKey = "name",
    xAxisLabel,
    valueFormat = "euro",
    normalize = false,
    totals,
    totalRow,
    context,
}: ChartSheetInput): ChartSheet {
    // A normalised chart draws shares and is labelled `percent` for it, but `data` still holds the
    // amounts — ChartContent divides them on its way to the bars. The sheet gets the amounts, so
    // it must print them as amounts; taking the format at face value would put a "%" after euros.
    const format = EXCEL_FORMAT[normalize ? "euro" : valueFormat];

    const rows: SheetData = [[{ type: String, value: title, fontWeight: "bold", fontSize: 14 }]];

    for (const regel of context) {
        rows.push([
            { type: String, value: regel.label, textColor: "#535862" },
            { type: String, value: regel.waarde },
        ]);
    }

    rows.push([]);

    const heeftTotalen = Array.isArray(totals) && totals.length > 0;
    rows.push([kopCel(xAxisLabel ?? ""), ...series.map((reeks) => kopCel(reeks.name)), ...(heeftTotalen ? [kopCel("Totaal")] : [])]);

    data.forEach((rij, index) => {
        rows.push([
            { type: String, value: String(rij[xAxisKey] ?? "") },
            ...series.map((reeks) => bedragCel(rij[reeks.key], format)),
            // The measured total, not the sum of the segments: each segment is rounded on its way
            // here and the rounding does not cancel. Same reason ChartCard takes a `totals` prop.
            ...(heeftTotalen ? [bedragCel(totals?.[index], format)] : []),
        ]);
    });

    if (totalRow) {
        rows.push([
            kopCel(totalRow.label),
            ...totalRow.values.map((waarde) => {
                const cel = bedragCel(waarde, format);
                return cel ? ({ ...cel, fontWeight: "bold" } as Cell) : null;
            }),
        ]);
    }

    return {
        rows,
        // The first column carries gemeente and taakveld names, which run long; the rest hold one
        // figure each.
        columns: [{ width: 34 }, ...series.map(() => ({ width: 18 })), ...(heeftTotalen ? [{ width: 18 }] : [])],
        sheet: sheetName(title),
    };
}

/**
 * Write the sheet and hand it to the browser's download.
 *
 * The xlsx library is imported here rather than at the top of the module so it is split into a
 * chunk of its own: every chart page would otherwise carry it, and most visits never download.
 */
export async function downloadChartSheet(sheet: ChartSheet, fileName: string): Promise<void> {
    const { default: writeExcelFile } = await import("write-excel-file/browser");
    await writeExcelFile(sheet.rows, { sheet: sheet.sheet, columns: sheet.columns }).toFile(fileName);
}
