import type { ChartSeries, ValueFormat } from "@/components/charts/chart-format";
import { formatValue, toNormalizedRows } from "@/components/charts/chart-format";

interface ChartValueTableProps {
    data: Record<string, unknown>[];
    series: ChartSeries[];
    xAxisKey: string;
    valueFormat: ValueFormat;
    /** Names the first column — the chart's own x-axis label when it has one. */
    xAxisLabel?: string;
    /** See ChartCardProps.normalize. Shares rather than bedragen, to match the chart above. */
    normalize?: boolean;
}

/**
 * The figures behind an expanded chart, spelled out.
 *
 * A chart answers "which way is it going"; the exact bedrag it leaves to the tooltip, one hover
 * at a time. Printing a value beside every point instead is the thing that doesn't work — two
 * series over eight jaren collide, and a horizontal-bar over a referentiegroep has dozens of
 * rows. So the numbers go under the chart, where every one of them is legible at once.
 */
export function ChartValueTable({ data, series, xAxisKey, valueFormat, xAxisLabel, normalize = false }: ChartValueTableProps) {
    if (data.length === 0 || series.length === 0) {
        return null;
    }

    const rows = normalize ? toNormalizedRows(data, series).rows : data;

    return (
        // A horizontal-bar over a whole referentiegroep runs to dozens of rows, so the body
        // scrolls under a header that stays put — the same bargain the chart itself makes.
        <div className="max-h-72 overflow-y-auto">
            <table className="w-full">
                <thead className="sticky top-0 bg-primary">
                    <tr>
                        <th className="bg-primary pr-4 pb-3 text-left text-sm font-normal text-tertiary">
                            {xAxisLabel ?? <span className="sr-only">Categorie</span>}
                        </th>
                        {series.map((s) => (
                            <th key={s.key} className="bg-primary pb-3 pl-4 text-right text-sm font-normal text-tertiary">
                                {/* The dot carries the series identity; the label itself stays on a
                                    text token — a light chart colour is unreadable as text. */}
                                <span className="inline-flex items-center gap-2">
                                    <span
                                        className="block size-2 shrink-0 rounded-full ring-[0.5px] ring-black/10 ring-inset"
                                        style={{ backgroundColor: s.color }}
                                    />
                                    {s.name}
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={String(row[xAxisKey] ?? index)} className="border-t border-tertiary">
                            <td className="py-2.5 pr-4 text-sm font-medium text-secondary">{String(row[xAxisKey] ?? "")}</td>
                            {series.map((s) => (
                                <td key={s.key} className="py-2.5 pl-4 text-right text-sm tabular-nums text-primary">
                                    {formatValue(row[s.key], valueFormat)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
