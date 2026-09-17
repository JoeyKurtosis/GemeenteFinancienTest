import type { ChartSeries } from "@/components/charts/chart-card";
import { formatTooltipValue, type ValueFormat } from "@/components/charts/chart-format";

interface ChartDataTableProps {
    title: string;
    data: Record<string, unknown>[];
    series: ChartSeries[];
    xAxisKey?: string;
    xAxisLabel?: string;
    valueFormat?: ValueFormat;
    totals?: number[];
    totalRow?: { label: string; values: (number | null | undefined)[] };
}

const displayValue = (value: unknown, format: ValueFormat) =>
    value === null || value === undefined || value === "" ? "Geen gegevens" : formatTooltipValue(value, format);

/** The same source rows as the chart, available without hover or a downloaded file. */
export function ChartDataTable({
    title,
    data,
    series,
    xAxisKey = "name",
    xAxisLabel,
    valueFormat = "euro",
    totals,
    totalRow,
}: ChartDataTableProps) {
    return (
        <details className="mt-4 rounded-lg border border-secondary text-sm text-secondary">
            <summary className="min-h-8 cursor-pointer rounded-lg px-3 py-2 font-medium text-brand-secondary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2">
                Gegevens als tabel
            </summary>
            <div tabIndex={0} role="region" aria-label={`${title}: tabel scrollen`} className="max-h-96 overflow-auto border-t border-secondary outline-focus-ring focus-visible:outline-2 focus-visible:-outline-offset-2">
                <table className="w-full min-w-max border-collapse text-left">
                    <caption className="sr-only">{title}: grafiekgegevens</caption>
                    <thead>
                        <tr className="bg-secondary">
                            <th scope="col" className="sticky top-0 bg-secondary px-3 py-2 font-semibold">{xAxisLabel || (xAxisKey === "name" ? "Categorie" : xAxisKey)}</th>
                            {series.map((item) => (
                                <th key={item.key} scope="col" className="sticky top-0 bg-secondary px-3 py-2 font-semibold">{item.name}</th>
                            ))}
                            {totals && <th scope="col" className="sticky top-0 bg-secondary px-3 py-2 font-semibold">Totaal</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, index) => (
                            <tr key={index} className="border-t border-secondary">
                                <th scope="row" className="px-3 py-2 font-medium">{String(row[xAxisKey] ?? "")}</th>
                                {series.map((item) => (
                                    <td key={item.key} className="px-3 py-2 tabular-nums">{displayValue(row[item.key], valueFormat)}</td>
                                ))}
                                {totals && <td className="px-3 py-2 font-semibold tabular-nums">{displayValue(totals[index], valueFormat)}</td>}
                            </tr>
                        ))}
                        {totalRow && (
                            <tr className="border-t border-secondary font-semibold">
                                <th scope="row" className="px-3 py-2">{totalRow.label}</th>
                                {series.map((item, index) => (
                                    <td key={item.key} className="px-3 py-2 tabular-nums">{displayValue(totalRow.values[index], valueFormat)}</td>
                                ))}
                            </tr>
                        )}
                    </tbody>
                </table>
                {data.length === 0 && <p className="px-3 py-2">Geen gegevens beschikbaar.</p>}
            </div>
        </details>
    );
}
