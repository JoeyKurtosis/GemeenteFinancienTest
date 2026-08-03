import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, type PieLabelRenderProps } from "recharts";
import { ChartTooltipContent } from "@/components/application/charts/charts-base";
import { sliceLabelLayout, sliceMidAngles } from "@/components/charts/donut-label-layout";

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
     * Draw each slice's figure outside the ring on a leader line. Costs the ring most of its
     * width, so it is for the expanded view rather than the cards on the page.
     */
    showSliceLabels?: boolean;
}

// Shared with the label layout, which has to arrive at the same slice angles recharts does.
const START_ANGLE = 90;
const END_ANGLE = -270;
const PADDING_ANGLE = 1;

/** Room kept clear at the top and bottom of the plot area so no label is cut off. */
const LABEL_MARGIN = 10;

const euros = (value: number) => `€ ${Number(value).toLocaleString("nl-NL")}`;

export function DonutChart({ data, centerValue, centerLabel, activeKey = null, height = 240, showSliceLabels = false }: DonutChartProps) {
    const values = useMemo(() => data.map((slice) => slice.value), [data]);
    const midAngles = useMemo(() => sliceMidAngles(values, START_ANGLE, END_ANGLE, PADDING_ANGLE), [values]);
    const total = values.reduce((sum, value) => sum + value, 0);

    // Recharts calls this once per slice, and the layout is the same every time — it is
    // recomputed rather than cached because a donut holds a dozen slices at most.
    const renderLabel = ({ cx, cy, outerRadius, index }: PieLabelRenderProps) => {
        const layout = sliceLabelLayout(midAngles, values, {
            cx: Number(cx),
            cy: Number(cy),
            outerRadius: Number(outerRadius),
            top: LABEL_MARGIN,
            bottom: height - LABEL_MARGIN,
        });
        const label = layout[index];
        const slice = data[index];
        if (!label || !slice) return null;

        const share = total > 0 ? Math.round((slice.value / total) * 100) : 0;

        return (
            <g pointerEvents="none" opacity={activeKey !== null && activeKey !== slice.name ? 0.25 : 1}>
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
                    {`${euros(slice.value)} (${share}%)`}
                </text>
            </g>
        );
    };

    return (
        <div className="relative w-full" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Tooltip
                        content={<ChartTooltipContent isPieChart formatter={(value) => euros(Number(value))} />}
                        cursor={{ fill: "var(--color-bg-secondary)" }}
                        // The centre overlay below is a later sibling with no z-index of its own, so
                        // source order alone would paint it over a tooltip that lands on the ring's middle.
                        wrapperStyle={{ zIndex: 10 }}
                    />
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        // The ring gives up the width the labels need to sit beside it, keeping
                        // its band roughly a third of the radius either way.
                        innerRadius={showSliceLabels ? "43%" : "62%"}
                        outerRadius={showSliceLabels ? "62%" : "90%"}
                        paddingAngle={PADDING_ANGLE}
                        stroke="var(--color-bg-primary)"
                        strokeWidth={2}
                        startAngle={START_ANGLE}
                        endAngle={END_ANGLE}
                        label={showSliceLabels ? renderLabel : undefined}
                        labelLine={false}
                    >
                        {data.map((slice) => (
                            <Cell key={slice.name} fill={slice.color} fillOpacity={activeKey !== null && activeKey !== slice.name ? 0.2 : 1} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>

            {/* Centre total overlay */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-display-sm font-semibold text-primary">{centerValue}</span>
                {centerLabel && <span className="text-xs text-tertiary italic">{centerLabel}</span>}
            </div>
        </div>
    );
}
