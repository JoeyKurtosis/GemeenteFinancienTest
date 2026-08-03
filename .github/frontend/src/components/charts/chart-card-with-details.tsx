import { useState } from "react";
import { Expand06, XClose } from "@untitledui/icons";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import type { ChartSeries, ChartType, ValueFormat } from "@/components/charts/chart-card";
import { ChartContent } from "@/components/charts/chart-card";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import { HighlightCard, type HighlightCardData } from "@/components/charts/highlight-card";
import { cx } from "@/utils/cx";

interface ChartCardWithDetailsProps {
    title: string;
    description: string;
    source?: { label: string; value: string }[];
    highlights: HighlightCardData[];
    data: Record<string, unknown>[];
    series: ChartSeries[];
    chartType: ChartType;
    xAxisKey?: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    showLegend?: boolean;
    /** How the figures read on the axis and in the tooltip. Euros unless the chart is a ratio. */
    valueFormat?: ValueFormat;
    expandable?: boolean;
    /** Show a skeleton placeholder instead of the chart while data loads. */
    isLoading?: boolean;
    className?: string;
}

export function ChartCardWithDetails({
    title,
    description,
    source,
    highlights,
    data,
    series,
    chartType,
    xAxisKey = "name",
    xAxisLabel,
    yAxisLabel,
    showLegend = true,
    valueFormat = "euro",
    expandable = false,
    isLoading = false,
    className,
}: ChartCardWithDetailsProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const chartContentProps = { data, series, chartType, xAxisKey, xAxisLabel, yAxisLabel, showLegend, valueFormat };

    const expandButton =
        expandable && !isLoading ? (
            <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="rounded-md p-1.5 text-fg-quaternary transition duration-100 ease-linear hover:bg-secondary_hover hover:text-fg-quaternary_hover"
            >
                <Expand06 className="size-5" aria-hidden="true" />
            </button>
        ) : null;

    return (
        <>
            <div className={cx("rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset", className)}>
                <div className="flex items-center justify-between px-5 pt-5 pb-1">
                    <h3 className="text-md font-semibold text-primary">{title}</h3>
                    {expandButton}
                </div>

                <div className="flex flex-col gap-6 px-5 pb-5 lg:flex-row">
                    <div className="flex flex-col gap-4 lg:w-2/5">
                        <p className="text-sm text-secondary">{description}</p>

                        {source && source.length > 0 && (
                            <div className="text-sm text-secondary">
                                <p className="font-semibold underline">Bron:</p>
                                {source.map((item) => (
                                    <p key={item.label}>
                                        {item.label}
                                        {item.value ? `: ${item.value}` : ""}
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-1 flex-col gap-4">
                        {isLoading ? (
                            <ChartSkeleton />
                        ) : (
                            <>
                                {highlights.length > 0 && (
                                    <div className="grid grid-cols-2 gap-3">
                                        {highlights.map((h) => (
                                            <HighlightCard key={h.label} {...h} />
                                        ))}
                                    </div>
                                )}

                                <ChartContent {...chartContentProps} />
                            </>
                        )}
                    </div>
                </div>
            </div>

            {expandable && !isLoading && (
                <DialogTrigger isOpen={isExpanded} onOpenChange={setIsExpanded}>
                    <ModalOverlay>
                        <Modal className="max-w-6xl">
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

                                    <div className="flex flex-col gap-6 lg:flex-row">
                                        <div className="flex flex-col gap-4 lg:w-1/3">
                                            <p className="text-sm text-secondary">{description}</p>

                                            {source && source.length > 0 && (
                                                <div className="text-sm text-secondary">
                                                    <p className="font-semibold underline">Bron:</p>
                                                    {source.map((item) => (
                                                        <p key={item.label}>
                                                            {item.label}
                                                            {item.value ? `: ${item.value}` : ""}
                                                        </p>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-1 flex-col gap-4">
                                            {highlights.length > 0 && (
                                                <div className="grid grid-cols-2 gap-3">
                                                    {highlights.map((h) => (
                                                        <HighlightCard key={h.label} {...h} />
                                                    ))}
                                                </div>
                                            )}

                                            <ChartContent {...chartContentProps} height={500} />
                                        </div>
                                    </div>
                                </div>
                            </Dialog>
                        </Modal>
                    </ModalOverlay>
                </DialogTrigger>
            )}
        </>
    );
}
