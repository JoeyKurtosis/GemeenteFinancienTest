import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Cell, Pie, PieChart, type PieLabelRenderProps, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltipContent } from "@/components/application/charts/charts-base";
import { formatShare, formatTooltipValue, formatValue } from "@/components/charts/chart-format";
import { sliceLabelLayout, sliceMidAngles } from "@/components/charts/donut-label-layout";
import { useResizeObserver } from "@/hooks/use-resize-observer";

export interface DonutSlice {
    name: string;
    value: number;
    color: string;
}

interface DonutChartProps {
    data: DonutSlice[];
    /** Large value shown in the centre of the ring (e.g. "€ 656"). */
    centerValue: string;
    /** Supporting label shown under the centre value (e.g. "Aa en Hunze"). */
    centerLabel?: string;
    /** The slice singled out on the ring, by name — the rest fade. Null when none is. */
    activeKey?: string | null;
    height?: number;
    /**
     * Ask for each slice's figure outside the ring on a leader line, so a share is readable
     * without hovering for a tooltip. Costs the ring the width the labels sit in, so it is a
     * request rather than a guarantee: where that width is not there, the labels are dropped
     * and the ring keeps its full size.
     */
    showSliceLabels?: boolean;
}

// Shared with the label layout, which has to arrive at the same slice angles recharts does.
const START_ANGLE = 90;
const END_ANGLE = -270;
const PADDING_ANGLE = 1;

/** Room kept clear at the top and bottom of the plot area so no label is cut off. */
const LABEL_MARGIN = 10;

/**
 * The leader line's run out: donut-label-layout's TEXT_OFFSET, plus the 4px the text is nudged
 * past where the line stops. The rest of a label's gutter is the string itself.
 */
const LABEL_RUN = 32;

/**
 * A label character, at the 11px the labels are drawn in — generous, and a guess by necessity:
 * SVG text cannot be measured before it is drawn, and the ring has to be sized before that.
 * Guessing high costs the ring a few pixels; guessing low clips the label, and it is the euro
 * sign leading the string that goes first.
 */
const CHAR_WIDTH = 6.2;

/** A labelled ring smaller than this is not worth reading, so the labels are dropped instead. */
const MIN_LABELLED_RADIUS = 60;

/**
 * The ring's share of the shorter axis, with the labels beside it and without. Two figures rather
 * than one because a bare ring pays no gutter, but it does not get the whole box either — a ring
 * that runs to the edges reads as a different chart from page to page, which is what the jump
 * from 0.62 to 0.9 used to do wherever a long legend squeezed the labels out.
 */
const RING_FILL = 0.62;
const RING_FILL_BARE = 0.75;

/** The ring's band, as a share of its outer radius — roughly a third of the radius. */
const BAND = 0.69;

/**
 * Whole euros, and it has to stay that way: this feeds the leader labels, and through their
 * string length the gutter that sizes the ring (see CHAR_WIDTH below). Cents here would shrink
 * every ring on the dashboard by some twenty pixels without anyone asking for it.
 *
 * The tooltip formats its own figure and is the one place the cents belong — a label reading
 * "€ 510 (17%)" against a tooltip reading "€ 509,85 (17,02%)" is the intended relationship
 * between the glance and the close read.
 */
const euros = (value: number) => formatValue(value, "euro");

function DonutCenter({ value, label, innerRadius, height }: { value: string; label?: string; innerRadius: number; height: number }) {
    const probeRef = useRef<HTMLDivElement>(null);
    const valueRef = useRef<HTMLSpanElement>(null);
    const [fit, setFit] = useState({ fontSize: 16, outside: false });
    // An inscribed square keeps the whole text block clear of the curved inner edge.
    const available = Math.max(0, innerRadius * Math.SQRT2 - 8);
    const measure = useCallback(() => {
        const probe = probeRef.current;
        const amount = valueRef.current;
        if (!probe || !amount) return;
        amount.style.fontSize = "";
        const maximum = Math.max(16, parseFloat(getComputedStyle(amount).fontSize));
        let fontSize = maximum;
        const fits = () => amount.getBoundingClientRect().width <= available && probe.getBoundingClientRect().height <= available;
        while (fontSize > 16 && !fits()) {
            fontSize = Math.max(16, fontSize - 1);
            amount.style.fontSize = `${fontSize}px`;
        }
        const outside = !fits();
        setFit((previous) => (previous.fontSize === fontSize && previous.outside === outside ? previous : { fontSize, outside }));
    }, [available]);
    useLayoutEffect(measure, [measure, value, label]);
    useResizeObserver({ ref: probeRef, onResize: measure });
    useEffect(() => {
        let active = true;
        void document.fonts.ready.then(() => {
            if (active) measure();
        });
        document.fonts.addEventListener("loadingdone", measure);
        return () => {
            active = false;
            document.fonts.removeEventListener("loadingdone", measure);
        };
    }, [measure]);

    const labelClass = "w-full text-xs leading-tight text-balance text-tertiary italic [overflow-wrap:normal] [word-break:normal]";
    return (
        <>
            <div aria-hidden="true" className="pointer-events-none invisible absolute top-0 left-0 overflow-hidden" style={{ width: available }}>
                <div ref={probeRef} className="flex flex-col items-center text-center">
                    <span ref={valueRef} className="text-display-sm leading-tight font-semibold whitespace-nowrap">
                        {value}
                    </span>
                    {label && <span className={labelClass}>{label}</span>}
                </div>
            </div>
            <div
                className={
                    fit.outside
                        ? "pointer-events-none flex min-w-0 flex-col items-center pb-2 text-center"
                        : "pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center justify-center text-center"
                }
                style={fit.outside ? undefined : { height }}
            >
                <div className="flex max-w-full flex-col items-center" style={fit.outside ? undefined : { width: available }}>
                    <span className="leading-tight font-semibold whitespace-nowrap text-primary" style={{ fontSize: fit.fontSize }}>
                        {value}
                    </span>
                    {label && <span className={labelClass}>{label}</span>}
                </div>
            </div>
        </>
    );
}

export function DonutChart({ data, centerValue, centerLabel, activeKey = null, height = 240, showSliceLabels = false }: DonutChartProps) {
    const values = useMemo(() => data.map((slice) => slice.value), [data]);
    const midAngles = useMemo(() => sliceMidAngles(values, START_ANGLE, END_ANGLE, PADDING_ANGLE), [values]);
    const total = values.reduce((sum, value) => sum + value, 0);

    // Built here rather than where they are drawn, because the widest of them is what decides how
    // much room the ring may take. Sizing off the strings themselves keeps the two in step: the
    // label that reserved the gutter is the label that lands in it.
    const labels = useMemo(
        () =>
            data.map((slice) =>
                total > 0 && slice.value / total >= 0.01 ? `${euros(slice.value)} (${Math.round((slice.value / total) * 100)}%)` : null,
            ),
        [data, total],
    );
    // Exclude hidden labels from collision spacing without changing the actual slice angles.
    const labelValues = useMemo(() => values.map((value, index) => (labels[index] === null ? 0 : value)), [values, labels]);

    // Recharts sizes a percentage radius off the shorter axis alone, which knows nothing about
    // the room the labels need beside the ring. So the radius is worked out here instead, from
    // the width the ring actually has — measured rather than assumed, since the same card is a
    // different width on every breakpoint.
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);
    const measure = useCallback(() => setWidth(containerRef.current?.clientWidth ?? 0), []);
    useResizeObserver({ ref: containerRef, onResize: measure });
    useLayoutEffect(measure, [measure]);

    // Where the two demands meet: the labels get their gutter, the ring gets what is left, and
    // neither is allowed to push the other off the SVG. Below the floor there is no ring worth
    // labelling, so the labels give way entirely — which is what a phone gets, with the tooltip
    // still answering for every slice.
    const gutter = LABEL_RUN + Math.max(0, ...labels.map((label) => label?.length ?? 0)) * CHAR_WIDTH;
    const roomBesideRing = width / 2 - gutter;
    const withLabels = showSliceLabels && roomBesideRing >= MIN_LABELLED_RADIUS;
    const shorterAxis = Math.min(width || height, height) / 2;
    const outerRadius = withLabels ? Math.min(shorterAxis * RING_FILL, roomBesideRing) : shorterAxis * RING_FILL_BARE;
    const innerRadius = outerRadius * BAND;

    // Recharts calls this once per slice, and the layout is the same every time — it is
    // recomputed rather than cached because a donut holds a dozen slices at most.
    const renderLabel = ({ cx, cy, outerRadius, index }: PieLabelRenderProps) => {
        const layout = sliceLabelLayout(midAngles, labelValues, {
            cx: Number(cx),
            cy: Number(cy),
            outerRadius: Number(outerRadius),
            top: LABEL_MARGIN,
            bottom: height - LABEL_MARGIN,
        });
        const label = layout[index];
        const slice = data[index];
        if (!label || !slice) return null;

        return (
            <g pointerEvents="none">
                <polyline
                    points={`${label.from.x},${label.from.y} ${label.knee.x},${label.knee.y} ${label.to.x},${label.to.y}`}
                    fill="none"
                    stroke="var(--color-border-secondary)"
                    strokeWidth={1}
                />
                <text
                    x={label.to.x + label.side * 4}
                    y={label.to.y}
                    fill="var(--color-text-tertiary)"
                    fontSize={11}
                    textAnchor={label.side === 1 ? "start" : "end"}
                    dominantBaseline="middle"
                >
                    {labels[index]}
                </text>
            </g>
        );
    };

    return (
        <div ref={containerRef} className="relative w-full min-w-0">
            <ResponsiveContainer width="100%" height={height} minWidth={0}>
                <PieChart accessibilityLayer={false} aria-hidden="true" tabIndex={-1}>
                    <Tooltip
                        // The exact figure and the slice's share of the ring — what the leader
                        // label rounds off, and what it has no room to say at all. Divided by
                        // the slices' own sum rather than by the measured centre total: the two
                        // agree to within half a cent per slice, and this way the tooltip's
                        // percentage matches the label's by construction, with the shares over
                        // one ring adding to exactly 100%.
                        content={
                            <ChartTooltipContent
                                isPieChart
                                formatter={(value) => {
                                    const bedrag = formatTooltipValue(value, "euro");
                                    const aandeel = formatShare(Number(value) || 0, total);
                                    return aandeel ? `${bedrag} (${aandeel})` : bedrag;
                                }}
                            />
                        }
                        cursor={{ fill: "var(--color-bg-secondary)" }}
                        // The centre overlay below is a later sibling with no z-index of its own, so
                        // source order alone would paint it over a tooltip that lands on the ring's middle.
                        wrapperStyle={{ zIndex: 10 }}
                    />
                    <Pie
                        rootTabIndex={-1}
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={innerRadius}
                        outerRadius={outerRadius}
                        paddingAngle={PADDING_ANGLE}
                        stroke="var(--color-bg-primary)"
                        strokeWidth={2}
                        startAngle={START_ANGLE}
                        endAngle={END_ANGLE}
                        label={withLabels ? renderLabel : undefined}
                        labelLine={false}
                    >
                        {data.map((slice) => (
                            <Cell key={slice.name} fill={slice.color} fillOpacity={activeKey !== null && activeKey !== slice.name ? 0.2 : 1} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>

            <DonutCenter value={centerValue} label={centerLabel} innerRadius={innerRadius} height={height} />
        </div>
    );
}
