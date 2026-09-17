import { type RefObject, useEffect, useRef, useState } from "react";
import { Edit05, Expand06, MessageChatSquare, XClose } from "@untitledui/icons";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartLegendContent, ChartTooltipContent } from "@/components/application/charts/charts-base";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Toggle } from "@/components/base/toggle/toggle";
import { ChartDownloadButton } from "@/components/charts/chart-download-button";
import { ChartDataTable } from "@/components/charts/chart-data-table";
import { formatShare, formatTooltipValue, formatValue, type ValueFormat } from "@/components/charts/chart-format";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import { useAuth } from "@/features/auth";
import type { ChartComment } from "@/features/comments";
import { ChartCommentButton, formatCommentDate, useChartAnchor } from "@/features/comments";
import { cx } from "@/utils/cx";

useAuth;

export interface ChartSeries {
    key: string;
    name: string;
    color: string;
    /** Render this series as a dashed line (e.g. an inflation reference line in `line` charts). */
    dashed?: boolean;
}

export type ChartType = "bar" | "area" | "horizontal-bar" | "line";

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
    /**
     * The total to print at the end of each bar, one per row, in `data` order
     * (`horizontal-bar` only). Without it the label is the sum of the row's segments, which is
     * not quite the same number: each segment is rounded on its way here, and the roundings do
     * not cancel. Pass the backend's `totalen`, which is the total measured and rounded once.
     */
    totals?: number[];
    /** Show a skeleton placeholder instead of the chart while data loads. */
    isLoading?: boolean;
    /**
     * Cap the chart's height and scroll inside it beyond that (`horizontal-bar` only,
     * which grows a row at a time and would otherwise run to any length). The legend stays
     * put; only the bars scroll.
     */
    maxHeight?: number;
    className?: string;
    /** Stable identifier for the comment system (e.g. "begroting:Uitgaven per jaar"). */
    chartId?: string;
    /** The user's existing comment for this chart, if any. */
    comment?: ChartComment;
    /** Called after a comment is saved or deleted to refresh the cache. */
    onCommentChange?: () => void;
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
    totals,
    isLoading = false,
    maxHeight,
    className,
    chartId,
    comment,
    onCommentChange,
}: ChartCardProps) {
    const chartRef = useRef<HTMLDivElement>(null);
    const expandedChartRef = useRef<HTMLDivElement>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    // The figures beside the points, which the reader asks for rather than arrives at: off on
    // every opening of the modal, however it was left the time before.
    const [showPoints, setShowPoints] = useState(false);
    const { isAuthenticated } = useAuth();
    // Lets a note in het notities-overzicht link back to this exact card. Arriving on that link
    // opens the chart at full size, where the note is printed under it.
    const { ref: anchorRef, anchorId, shouldExpand } = useChartAnchor(chartId, isLoading);

    useEffect(() => {
        if (shouldExpand && expandable) setIsExpanded(true);
    }, [shouldExpand, expandable]);

    const chartContentProps = { title, data, series, chartType, xAxisKey, xAxisLabel, yAxisLabel, showLegend, valueFormat, normalize, totals };
    const table = <ChartDataTable title={title} data={data} series={series} xAxisKey={xAxisKey} xAxisLabel={xAxisLabel} valueFormat={valueFormat} totals={totals} />;

    // What a comment button needs, or null where this chart has no note to write: a signed-in
    // reader and a caller that both named the chart and asked to hear about the change.
    const commentEditor = isAuthenticated && chartId && onCommentChange ? { chartId, onSaved: onCommentChange } : null;

    // Only the trend shapes have points to mark; a bar carries its figures on the bars
    // themselves, so there is nothing there to turn on.
    const pointsToggle =
        chartType === "line" || chartType === "area" ? (
            <Toggle
                size="sm"
                label="Waarden tonen"
                aria-label="Waarden bij de punten tonen"
                isSelected={showPoints}
                onChange={setShowPoints}
                className="mr-2 flex-row items-center gap-2"
            />
        ) : null;

    // The same figures the chart is drawn from, as a spreadsheet. `normalize` goes along because
    // it decides whether these values read as amounts or as shares — see buildChartSheet.
    const downloadButton = (imageRef: RefObject<HTMLDivElement | null>) => !isLoading ? (
        <ChartDownloadButton
            imageRef={imageRef}
            title={title}
            data={data}
            series={series}
            xAxisKey={xAxisKey}
            xAxisLabel={xAxisLabel}
            valueFormat={valueFormat}
            normalize={normalize}
            shareBasis={(chartType === "bar" || chartType === "horizontal-bar") && series.length > 1 ? "row" : undefined}
            totals={totals}
        />
    ) : null;

    return (
        <>
            <div
                ref={anchorRef}
                id={anchorId}
                className={cx(
                    "scroll-mt-24 rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset",
                    // Arrived here from a link to this chart: say which one was meant.
                    "target:ring-2 target:ring-brand",
                    className,
                )}
            >
                <div className="flex items-center justify-between px-5 pt-5 pb-1">
                    <h3 className="text-md font-semibold text-primary">{title}</h3>
                    <div className="flex items-center gap-1">
                        {commentEditor && !isLoading && <ChartCommentButton {...commentEditor} comment={comment} />}
                        {downloadButton(chartRef)}
                        {expandable && !isLoading && (
                            <button
                                type="button"
                                onClick={() => setIsExpanded(true)}
                                aria-label={`${title} vergroten`}
                                className="rounded-md p-1.5 text-fg-tertiary outline-focus-ring transition duration-100 ease-linear hover:bg-secondary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
                            >
                                <Expand06 className="size-5" aria-hidden="true" />
                            </button>
                        )}
                    </div>
                </div>
                <div className="px-5 pb-5">{isLoading ? <ChartSkeleton /> : <><div ref={chartRef}><ChartContent {...chartContentProps} maxHeight={maxHeight} /></div>{table}</>}</div>
            </div>

            {expandable && !isLoading && (
                <DialogTrigger
                    isOpen={isExpanded}
                    onOpenChange={(open) => {
                        setIsExpanded(open);
                        if (!open) setShowPoints(false);
                    }}
                >
                    <ModalOverlay>
                        <Modal className="max-w-5xl">
                            <Dialog aria-label={title} className="flex-col">
                                <div className="w-full rounded-xl bg-primary p-6 shadow-lg">
                                    <div className="mb-4 flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-primary">{title}</h3>
                                        <div className="flex items-center gap-1">
                                            {pointsToggle}
                                            {/* A note that exists is edited by the pencil beside it, under the chart;
                                                only the chart without one still needs a way in from up here. */}
                                            {commentEditor && !comment?.text && <ChartCommentButton {...commentEditor} comment={comment} />}
                                            {downloadButton(expandedChartRef)}
                                            <button
                                                type="button"
                                                onClick={() => setIsExpanded(false)}
                                                aria-label="Sluiten"
                                                className="cursor-pointer rounded-md p-1.5 text-fg-tertiary outline-focus-ring transition duration-100 ease-linear hover:bg-secondary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
                                            >
                                                <XClose className="size-5" aria-hidden="true" />
                                            </button>
                                        </div>
                                    </div>
                                    {/* Expanding is what you do to see the long list, so the
                                        cap is roomier here — it still scrolls, in a taller box. */}
                                    <div ref={expandedChartRef}><ChartContent {...chartContentProps} height={500} maxHeight={maxHeight ? 560 : undefined} showPoints={showPoints} /></div>
                                    {table}
                                    {comment?.text && (
                                        <div className="mt-4 flex items-start gap-2 rounded-lg bg-secondary p-3">
                                            <MessageChatSquare className="mt-0.5 size-4 shrink-0 text-brand-secondary" aria-hidden="true" />
                                            <div className="flex flex-1 flex-col gap-1">
                                                <p className="text-sm whitespace-pre-wrap text-secondary">{comment.text}</p>
                                                <p className="text-xs text-tertiary">Bijgewerkt op {formatCommentDate(comment.updated_at)}</p>
                                            </div>
                                            {commentEditor && (
                                                <ChartCommentButton
                                                    {...commentEditor}
                                                    comment={comment}
                                                    icon={Edit05}
                                                    label="Notitie bewerken"
                                                    className="-my-1 shrink-0"
                                                />
                                            )}
                                        </div>
                                    )}
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
    title: string;
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
    /** See ChartCardProps.totals. */
    totals?: number[];
    height?: number;
    maxHeight?: number;
    /**
     * Mark every point on a `line` or `area` chart with a dot and print its figure beside it.
     * Only ever on in the expand modal, and only when the reader asks for it there: at card
     * size — fourteen charts on a page at 300px each — the figures are a wall of ink, and even
     * at full size they are a close-reading aid rather than how the chart is first met.
     */
    showPoints?: boolean;
}

export function ChartContent({
    title,
    data,
    series,
    chartType,
    xAxisKey,
    xAxisLabel,
    yAxisLabel,
    showLegend = true,
    valueFormat = "euro",
    normalize = false,
    totals,
    height = 300,
    maxHeight,
    showPoints = false,
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

    const isBarChart = chartType === "bar" || chartType === "horizontal-bar";

    // The share a stacked segment is of its own bar. Only where a bar actually *is* a stack:
    // one series is 100% of itself, which is not information. Never on a normalised chart,
    // where the value drawn already is the share, and not on `line` or `area`, where the series
    // are alternatives at a point on the axis rather than parts of one whole.
    const showsShare = isBarChart && !normalize && series.length > 1 && valueFormat !== "percent";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tooltipFormat = (value: unknown, _name?: unknown, entry?: any) => {
        const bedrag = formatTooltipValue(value, valueFormat);
        if (!showsShare) return bedrag;

        // The row is read off the tooltip entry rather than looked up in `totals` by index:
        // ChartTooltipContent hands the formatter an entry on both of its paths, but the index
        // it passes is the entry's position within the tooltip payload — 0 for every stacked
        // bar — and not the row's. Summing the row's own segments needs no index at all.
        //
        // It costs the difference between that sum and the independently measured `totals`,
        // which is half a cent per segment now that the backend carries cents, and so cannot
        // show at two decimals. In exchange the shares over one bar add to exactly 100%, which
        // is what a reader hovering each segment in turn is checking.
        //
        // A negative segment is left without a share (see formatShare) while the positive ones
        // beside it keep theirs, against a total its own sign has pulled down — so those can
        // read over 100%. That is arithmetically true and visible in the bar itself; dropping
        // every share on the bar because one segment went negative would surprise more.
        const rij = entry?.payload as Record<string, unknown> | undefined;
        const totaal = series.reduce((sum, serie) => sum + (Number(rij?.[serie.key]) || 0), 0);
        const aandeel = formatShare(Number(value) || 0, totaal);
        return aandeel ? `${bedrag} (${aandeel})` : bedrag;
    };

    const tooltip = (
        <Tooltip
            // A bar stacks its series into one column, and the segment under the pointer is
            // the one being asked about — reciting the whole stack buries it. A line or area
            // is read the other way round: the series are compared at that point on the axis,
            // so those keep the shared tooltip.
            shared={!isBarChart}
            content={<ChartTooltipContent formatter={tooltipFormat} showSeriesName={isBarChart} labelKey={xAxisKey} />}
            cursor={isBarChart ? { fill: "var(--color-bg-secondary)", radius: 4 } : { stroke: "var(--color-border-secondary)" }}
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
                  ...Object.fromEntries(series.map((s) => [s.key, totalPerRow[index] ? ((Number(entry[s.key]) || 0) / totalPerRow[index]) * 100 : 0])),
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
                <div
                    className={cx(scrolls && "overflow-y-auto rounded-sm outline-focus-ring focus-visible:outline-2 focus-visible:-outline-offset-2")}
                    style={scrolls ? { height: maxHeight } : undefined}
                    role={scrolls ? "region" : undefined}
                    aria-label={scrolls ? `${title}: grafiek scrollen` : undefined}
                    tabIndex={scrolls ? 0 : undefined}
                >
                    <ResponsiveContainer width="100%" height={barHeight}>
                        <BarChart accessibilityLayer={false} aria-hidden="true" tabIndex={-1} data={rows} layout="vertical" barCategoryGap="20%" margin={{ left: 10, right: normalize ? 16 : 60 }}>
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
                                tickFormatter={normalize ? (value: unknown) => `${value}%` : (value: unknown) => format(Number(value) || 0)}
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
                                                // The measured total where the caller has one;
                                                // the segments only add up to it by luck.
                                                const total = totals?.[index ?? 0] ?? series.reduce((sum, s) => sum + (Number(entry?.[s.key]) || 0), 0);
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
    // being read — `euro-compact` among them, or absolute bedragen would print their ten digits
    // raw down the axis instead of reading "€ 25 mln.". Not on the bars: `horizontal-bar` spends
    // its y-axis on the categorie names, and signing those would put a € in front of a taakveld.
    // `index` carries no unit, so its ticks are left bare.
    const yAxisTickFormatter =
        valueFormat === "percent"
            ? (value: unknown) => `${value}%`
            : (valueFormat === "euro" || valueFormat === "euro-compact") && (chartType === "line" || chartType === "area")
              ? (value: unknown) => format(value)
              : undefined;

    const yAxis = (
        <YAxis
            {...sharedAxisProps}
            // A signed tick outgrows the 60px recharts reserves by default and is cut off at the
            // left edge of the card; `auto` measures the widest one instead.
            width={yAxisTickFormatter ? "auto" : undefined}
            tickFormatter={yAxisTickFormatter}
            label={
                yAxisLabel ? { value: yAxisLabel, angle: -90, position: "insideLeft", offset: 10, fontSize: 12, fill: "var(--color-text-tertiary)" } : undefined
            }
        />
    );

    const grid = <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" vertical={false} />;

    // The two trend shapes — `line` and `area` — mark every point and print its figure once the
    // reader turns the figures on. Shared between them because they are the same chart to read:
    // a handful of years across a few cohorts, where the question is what a given year was.
    //
    // Which series runs highest at each point decides whether its figure goes above the line or
    // below, so that two series meeting — the moment the chart is read most closely — do not
    // stack their labels on one another.
    const hoogsteReeks = showPoints
        ? data.map((entry) => {
              let hoogste: string | undefined;
              let waarde = -Infinity;
              for (const s of series) {
                  const eigen = Number(entry[s.key]);
                  if (Number.isFinite(eigen) && eigen > waarde) {
                      waarde = eigen;
                      hoogste = s.key;
                  }
              }
              return hoogste;
          })
        : [];

    const puntDot = (s: ChartSeries) => (showPoints ? { r: 3.5, fill: s.color, strokeWidth: 0, fillOpacity: isDimmed(s.key) ? 0.2 : 1 } : false);

    const puntLabels = (s: ChartSeries) =>
        showPoints ? (
            <LabelList
                dataKey={s.key}
                content={({ x, y, index, value }) => {
                    // A gap in the series — a cohort with no filing that year — has a dot at no
                    // point, so it gets no figure either.
                    if (value === null || value === undefined) return null;
                    const positie = index ?? 0;
                    const boven = hoogsteReeks[positie] === s.key;
                    // The first and last points sit on the edges of the plot area, so a figure
                    // centred on them hangs half outside it and is cut off by the container —
                    // "€ 3.657" ends up reading "€ 3.65". Those two turn inward instead, and
                    // grow into the chart rather than over its edge.
                    const uitlijning = positie === 0 ? "start" : positie === data.length - 1 ? "end" : "middle";
                    return (
                        <text
                            x={x as number}
                            y={(y as number) + (boven ? -12 : 20)}
                            textAnchor={uitlijning}
                            fill="var(--color-text-tertiary)"
                            fillOpacity={isDimmed(s.key) ? 0.2 : 1}
                            fontSize={12}
                        >
                            {format(value)}
                        </text>
                    );
                }}
            />
        ) : null;

    // Room above for the topmost label, which sits outside the plot area and would otherwise be
    // clipped by the container.
    const trendMargin = showPoints ? { top: 24, right: 16, bottom: 5, left: 5 } : undefined;

    if (chartType === "line") {
        return (
            <ResponsiveContainer width="100%" height={height}>
                <LineChart accessibilityLayer={false} aria-hidden="true" tabIndex={-1} data={data} margin={trendMargin}>
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
                            dot={puntDot(s)}
                            activeDot={{ r: 4 }}
                        >
                            {puntLabels(s)}
                        </Line>
                    ))}
                </LineChart>
            </ResponsiveContainer>
        );
    }

    if (chartType === "bar") {
        return (
            <ResponsiveContainer width="100%" height={height}>
                <BarChart accessibilityLayer={false} aria-hidden="true" tabIndex={-1} data={data} barCategoryGap="20%">
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
            <AreaChart accessibilityLayer={false} aria-hidden="true" tabIndex={-1} data={data} margin={trendMargin}>
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
                        dot={puntDot(s)}
                    >
                        {puntLabels(s)}
                    </Area>
                ))}
            </AreaChart>
        </ResponsiveContainer>
    );
}
