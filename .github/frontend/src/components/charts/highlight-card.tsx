import { MetricChangeIndicator } from "@/components/application/metrics/metrics";
import { cx } from "@/utils/cx";

export interface HighlightCardData {
    label: string;
    value: string;
    /** Change against the previous year. Absent when there is no previous year to compare with. */
    change?: string;
    trend?: "positive" | "negative";
}

interface HighlightCardProps extends HighlightCardData {
    className?: string;
}

export function HighlightCard({ label, value, change, trend, className }: HighlightCardProps) {
    return (
        <div className={cx("flex flex-col gap-2 rounded-lg px-4 py-3 ring-1 ring-secondary ring-inset", className)}>
            <span className="text-sm font-medium text-tertiary">{label}</span>
            <div className="flex items-end justify-between gap-3">
                <span className="text-display-xs font-semibold text-primary">{value}</span>
                {change && trend && <MetricChangeIndicator type="trend" trend={trend} value={change} />}
            </div>
        </div>
    );
}
