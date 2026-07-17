import { cx } from "@/utils/cx";

interface ChartSkeletonProps {
    /** Height of the chart placeholder block, matching `ChartContent`'s height. */
    height?: number;
    /** Render a short title bar above the chart block. */
    showTitle?: boolean;
    /** Additional CSS classes to apply to the wrapper. */
    className?: string;
}

/** Simple pulsing block placeholder shown in a chart card while its data loads. */
export function ChartSkeleton({ height = 300, showTitle = false, className }: ChartSkeletonProps) {
    return (
        <div className={cx("flex animate-pulse flex-col gap-4", className)} aria-hidden="true">
            {showTitle && <div className="h-5 w-40 rounded-md bg-secondary" />}
            <div className="w-full rounded-lg bg-secondary" style={{ height }} />
        </div>
    );
}
