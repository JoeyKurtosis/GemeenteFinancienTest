import { useState } from "react";
import { Expand06, XClose } from "@untitledui/icons";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartLegendContent, ChartTooltipContent } from "@/components/application/charts/charts-base";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import { cx } from "@/utils/cx";

export interface ChartSeries {
    key: string;
    name: string;
    color: string;
    /** Render this series as a dashed line (e.g. an inflation reference line in `line` charts). */
    dashed?: boolean;
}

export type ChartType = "bar" | "area" | "horizontal-bar" | "line";

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

export const formatValue = (value: unknown, format: ValueFormat): string => {
    const number = Number(value) || 0;
    if (format === "percent") {
        return `${number.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
    }
    if (format === "index") {
        return number.toLocaleString("nl-NL");
    }
    if (format === "euro-compact") {
        return euroCompact.format(Math.round(number / EURO_COMPACT_STAP) * EURO_COMPACT_STAP);
    }
    return `€ ${number.toLocaleString("nl-NL")}`;
};

interface ChartCardProps {
    title: string;
    data: Record<string, unknown>[];
    series: ChartSeries[];
    chartType: ChartType;
    xAxisKey?: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    showLegend?: boolean;
    expandable?: boolean;
    /** How to render the figures — euros unless the chart is a percentage. */
    valueFormat?: ValueFormat;
    /**
     * Draw each row as shares of its own total rather than as the amounts themselves, so
     * every bar fills the width and ends at 100% (`horizontal-bar` only). Pass
     * `valueFormat="percent"` with it — the segments then carry a share, not a bedrag.
     */
    normalize?: boolean;
    /** Show a skeleton placeholder instead of the chart while data loads. */
    isLoading?: boolean;
    /**
     * Cap the chart's height and scroll inside it beyond that (`horizontal-bar` only,
     * which grows a row at a time and would otherwise run to any length). The legend stays
     * put; only the bars scroll.
     */
    maxHeight?: number;
    className?: string;
}

export function ChartCard({
    title,
    data,
    series,
    chartType,
    xAxisKey = "name",
    xAxisLabel,
    yAxisLabel,
    showLegend = true,
    expandable = false,
    valueFormat = "euro",
    normalize = false,
    isLoading = false,
    maxHeight,
    className,
}: ChartCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const chartContentProps = { data, series, chartType, xAxisKey, xAxisLabel, yAxisLabel, showLegend, valueFormat, normalize };

    return (
        <>
            <div className={cx("rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset", className)}>
                <div className="flex items-center justify-between px-5 pt-5 pb-1">
                    <h3 className="text-md font-semibold text-primary">{title}</h3>
                    {expandable && !isLoading && (
                        <button
                            type="button"
                            onClick={() => setIsExpanded(true)}
                            className="rounded-md p-1.5 text-fg-quaternary transition duration-100 ease-linear hover:bg-secondary_hover hover:text-fg-quaternary_hover"
                        >
                            <Expand06 className="size-5" aria-hidden="true" />
                        </button>
                    )}
                </div>
                <div className="px-5 pb-5">{isLoading ? <ChartSkeleton /> : <ChartContent {...chartContentProps} maxHeight={maxHeight} />}</div>
            </div>

            {expandable && !isLoading && (
                <DialogTrigger isOpen={isExpanded} onOpenChange={setIsExpanded}>
                    <ModalOverlay>
                        <Modal className="max-w-5xl">
                            <Dialog className="flex-col">
                                <div className="w-full rounded-xl bg-primary p-6 shadow-lg">
                                    <div className="mb-4 flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-primary">{title}</h3>
                                        <button
                                            type="button"
                                            onClick={() => setIsExpanded(false)}
                                            className="rounded-md p-1.5 text-fg-quaternary transition duration-100 ease-linear hover:bg-secondary_hover hover:text-fg-quaternary_hover"
                                        >
                                            <XClose className="size-5" aria-hidden="true" />
                                        </button>
                                    </div>
                                    {/* Expanding is what you do to see the long list, so the
                                        cap is roomier here — it still scrolls, in a taller box. */}
                                    <ChartContent {...chartContentProps} height={500} maxHeight={maxHeight ? 560 : undefined} />
                                </div>
                            </Dialog>
                        </Modal>
                    </ModalOverlay>
                </DialogTrigger>
            )}
        </>
    );
}

interface ChartContentProps {
    data: Record<string, unknown>[];
    series: ChartSeries[];
    chartType: ChartType;
    xAxisKey: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    showLegend?: boolean;
    valueFormat?: ValueFormat;
    /** See ChartCardProps.normalize. */
    normalize?: boolean;
    height?: number;
    maxHeight?: number;
}

export function ChartContent({
    data,
    series,
    chartType,
    xAxisKey,
    xAxisLabel,
    yAxisLabel,
    showLegend = true,
    valueFormat = "euro",
    normalize = false,
    height = 300,
    maxHeight,
}: ChartContentProps) {
    const reversedSeries = [...series].reverse();
    const format = (value: unknown) => formatValue(value, valueFormat);

    // Clicking a legend row singles that series out and fades the rest; clicking it again,
    // or clicking another row, moves the highlight. Purely a reading aid — nothing is
    // filtered out, so the tooltip still answers for every series at once.
    const [highlighted, setHighlighted] = useState<string | null>(null);
    // Derived rather than stored: a series can leave under the filters (a size class
    // deselected), and a highlight left pointing at it would fade every remaining line
    // while singling out none.
    const activeKey = highlighted !== null && series.some((s) => s.key === highlighted) ? highlighted : null;
    const toggleHighlight = (key: string) => setHighlighted((current) => (current === key ? null : key));
    const isDimmed = (key: string) => activeKey !== null && activeKey !== key;

    const sharedAxisProps = {
        tick: { fontSize: 12, fill: "var(--color-text-tertiary)" },
        axisLine: false,
        tickLine: false,
    };

    const legend = showLegend ? (
        <Legend
            verticalAlign="top"
            align={chartType === "horizontal-bar" ? "left" : "right"}
            content={<ChartLegendContent reversed={chartType === "bar"} activeKey={activeKey} onItemClick={toggleHighlight} />}
            // Recharts sorts the legend by series name unless this is null, and it does so
            // before the content sees the payload — so the labels, not the caller, would
            // decide the order. Size classes ("< 25.000", "G4") then sort by character
            // code and land in an order that means nothing. The series arrive in the order
            // they are meant to read in; keep it, and let `reversed` be the only thing
            // that moves them.
            itemSorter={null}
            wrapperStyle={{ paddingBottom: 12 }}
        />
    ) : undefined;

    const tooltip = (
        <Tooltip
            content={<ChartTooltipContent formatter={format} />}
            cursor={
                chartType === "bar" || chartType === "horizontal-bar"
                    ? { fill: "var(--color-bg-secondary)", radius: 4 }
                    : { stroke: "var(--color-border-secondary)" }
            }
        />
    );

    if (chartType === "horizontal-bar") {
        // The chart grows a row at a time rather than fitting a fixed box, so with enough
        // rows (every gemeente in a large referentiegroep) it runs off the page. Past
        // `maxHeight` the bars scroll instead — each one carries its own euro figures, so
        // nothing is lost by scrolling the x-axis out of view.
        const barHeight = Math.max(data.length * 52 + 40, 120);
        const scrolls = maxHeight !== undefined && barHeight > maxHeight;

        const totalPerRow = data.map((entry) => series.reduce((sum, s) => sum + (Number(entry[s.key]) || 0), 0));

        // Normalised rows are drawn from figures of their own rather than from `data`, so
        // every segment is its share of the row it sits in and the bar ends at 100. A row
        // that totals nothing stays at zero — there is no share of nothing to take.
        const rows = normalize
            ? data.map((entry, index) => ({
                  ...entry,
                  ...Object.fromEntries(
                      series.map((s) => [s.key, totalPerRow[index] ? ((Number(entry[s.key]) || 0) / totalPerRow[index]) * 100 : 0]),
                  ),
              }))
            : data;

        // What a segment is measured against for the "too thin to label" test below.
        const maxTotal = normalize ? 100 : Math.max(...totalPerRow);

        return (
            <div className="flex flex-col gap-4">
                {/* Its own legend rather than Recharts': this one sits outside the scroll
                    box, so it stays put while the bars scroll under it. */}
                {showLegend && (
                    <ChartLegendContent
                        payload={series.map((s) => ({ value: s.name, color: s.color, dataKey: s.key, type: "square" }))}
                        activeKey={activeKey}
                        onItemClick={toggleHighlight}
                        className="flex-wrap gap-x-4 gap-y-1"
                    />
                )}
                <div className={cx(scrolls && "overflow-y-auto")} style={scrolls ? { height: maxHeight } : undefined}>
                    <ResponsiveContainer width="100%" height={barHeight}>
                        <BarChart data={rows} layout="vertical" barCategoryGap="20%" margin={{ left: 10, right: normalize ? 16 : 60 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" horizontal={false} />
                            <YAxis dataKey={xAxisKey} type="category" {...sharedAxisProps} width={120} />
                            {/* Pinned to 0–100 when normalised, with the ticks named rather than
                                left to recharts: shares are floating-point divisions and a row
                                lands on 100.00000000000003, which it will happily print. */}
                            <XAxis
                                type="number"
                                {...sharedAxisProps}
                                domain={normalize ? [0, 100] : undefined}
                                ticks={normalize ? [0, 50, 100] : undefined}
                                tickFormatter={normalize ? (value: unknown) => `${value}%` : undefined}
                            />
                            {tooltip}
                            {series.map((s, i) => (
                                <Bar
                                    key={s.key}
                                    dataKey={s.key}
                                    name={s.name}
                                    stackId="stack"
                                    fill={s.color}
                                    fillOpacity={isDimmed(s.key) ? 0.2 : 1}
                                    radius={0}
                                >
                                    <LabelList
                                        dataKey={s.key}
                                        position="center"
                                        fill="#fff"
                                        fontSize={11}
                                        fontWeight={600}
                                        content={({ x, y, width, height: h, value }) => {
                                            const numValue = Number(value) || 0;
                                            const segmentRatio = numValue / maxTotal;
                                            if (segmentRatio < 0.06 || (width as number) < 45) return null;
                                            // The figure is white on the segment's own fill;
                                            // once that fill fades it has nothing to sit on.
                                            if (isDimmed(s.key)) return null;
                                            return (
                                                <text
                                                    x={(x as number) + (width as number) / 2}
                                                    y={(y as number) + (h as number) / 2}
                                                    fill="#fff"
                                                    fontSize={11}
                                                    fontWeight={600}
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                >
                                                    {format(numValue)}
                                                </text>
                                            );
                                        }}
                                    />
                                    {/* The total at the end of the bar, which a normalised
                                        one has no use for: it is 100% on every row. */}
                                    {i === series.length - 1 && !normalize && (
                                        <LabelList
                                            position="right"
                                            content={({ x, y, width, height: h, index }) => {
                                                const entry = data[index ?? 0];
                                                const total = series.reduce((sum, s) => sum + (Number(entry?.[s.key]) || 0), 0);
                                                return (
                                                    <text
                                                        x={(x as number) + (width as number) + 8}
                                                        y={(y as number) + (h as number) / 2}
                                                        fill="var(--color-text-tertiary)"
                                                        fontSize={12}
                                                        dominantBaseline="middle"
                                                    >
                                                        {format(total)}
                                                    </text>
                                                );
                                            }}
                                        />
                                    )}
                                </Bar>
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }

    const xAxis = (
        <XAxis
            dataKey={xAxisKey}
            {...sharedAxisProps}
            label={xAxisLabel ? { value: xAxisLabel, position: "insideBottom", offset: -2, fontSize: 12, fill: "var(--color-text-tertiary)" } : undefined}
        />
    );

    // Percent ticks stay whole — `format` would spend two decimals on every one of them.
    // Euro ticks are signed on `line` and `area`, the two where the y-axis carries the figure
    // being read. Not on the bars: `horizontal-bar` spends its y-axis on the categorie names,
    // and signing those would put a € in front of a taakveld. `index` carries no unit, so its
    // ticks are left bare.
    const yAxisTickFormatter =
        valueFormat === "percent"
            ? (value: unknown) => `${value}%`
            : valueFormat === "euro" && (chartType === "line" || chartType === "area")
              ? (value: unknown) => format(value)
              : undefined;

    const yAxis = (
        <YAxis
            {...sharedAxisProps}
            tickFormatter={yAxisTickFormatter}
            label={
                yAxisLabel ? { value: yAxisLabel, angle: -90, position: "insideLeft", offset: 10, fontSize: 12, fill: "var(--color-text-tertiary)" } : undefined
            }
        />
    );

    const grid = <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" vertical={false} />;

    if (chartType === "line") {
        return (
            <ResponsiveContainer width="100%" height={height}>
                <LineChart data={data}>
                    {grid}
                    {xAxis}
                    {yAxis}
                    {tooltip}
                    {legend}
                    {series.map((s) => (
                        <Line
                            key={s.key}
                            type="monotone"
                            dataKey={s.key}
                            name={s.name}
                            stroke={s.color}
                            strokeWidth={activeKey === s.key ? 3 : 2}
                            strokeOpacity={isDimmed(s.key) ? 0.2 : 1}
                            strokeDasharray={s.dashed ? "4 4" : undefined}
                            dot={false}
                            activeDot={{ r: 4 }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        );
    }

    if (chartType === "bar") {
        return (
            <ResponsiveContainer width="100%" height={height}>
                <BarChart data={data} barCategoryGap="20%">
                    {grid}
                    {xAxis}
                    {yAxis}
                    {tooltip}
                    {legend}
                    {reversedSeries.map((s) => (
                        <Bar
                            key={s.key}
                            dataKey={s.key}
                            name={s.name}
                            stackId="stack"
                            fill={s.color}
                            fillOpacity={isDimmed(s.key) ? 0.2 : 1}
                            radius={[0, 0, 0, 0]}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data}>
                {grid}
                {xAxis}
                {yAxis}
                {tooltip}
                {legend}
                {reversedSeries.map((s) => (
                    <Area
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        name={s.name}
                        stroke={s.color}
                        fill={s.color}
                        fillOpacity={isDimmed(s.key) ? 0.02 : 0.08}
                        strokeWidth={activeKey === s.key ? 3 : 2}
                        strokeOpacity={isDimmed(s.key) ? 0.2 : 1}
                        dot={false}
                    />
                ))}
            </AreaChart>
        </ResponsiveContainer>
    );
}
