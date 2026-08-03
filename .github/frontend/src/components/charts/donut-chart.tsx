import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltipContent } from "@/components/application/charts/charts-base";

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
}

export function DonutChart({ data, centerValue, centerLabel, activeKey = null, height = 240 }: DonutChartProps) {
    return (
        <div className="relative w-full" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Tooltip
                        content={<ChartTooltipContent isPieChart formatter={(value) => `€ ${Number(value).toLocaleString("nl-NL")}`} />}
                        cursor={{ fill: "var(--color-bg-secondary)" }}
                    />
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius="62%"
                        outerRadius="90%"
                        paddingAngle={1}
                        stroke="var(--color-bg-primary)"
                        strokeWidth={2}
                        startAngle={90}
                        endAngle={-270}
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
