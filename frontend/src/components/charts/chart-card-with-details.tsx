import { type RefObject, useEffect, useRef, useState } from "react";
import { Edit05, Expand06, MessageChatSquare, XClose } from "@untitledui/icons";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Toggle } from "@/components/base/toggle/toggle";
import type { ChartSeries, ChartType } from "@/components/charts/chart-card";
import { ChartContent } from "@/components/charts/chart-card";
import { ChartDownloadButton } from "@/components/charts/chart-download-button";
import { ChartDataTable } from "@/components/charts/chart-data-table";
import type { ValueFormat } from "@/components/charts/chart-format";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import { HighlightCard, type HighlightCardData } from "@/components/charts/highlight-card";
import { useAuth } from "@/features/auth";
import type { ChartComment } from "@/features/comments";
import { ChartCommentButton, formatCommentDate, useChartAnchor } from "@/features/comments";
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
    chartId?: string;
    comment?: ChartComment;
    onCommentChange?: () => void;
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
    chartId,
    comment,
    onCommentChange,
}: ChartCardWithDetailsProps) {
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

    const chartContentProps = { title, data, series, chartType, xAxisKey, xAxisLabel, yAxisLabel, showLegend, valueFormat };
    const table = <ChartDataTable title={title} data={data} series={series} xAxisKey={xAxisKey} xAxisLabel={xAxisLabel} valueFormat={valueFormat} />;

    // What a comment button needs, or null where this chart has no note to write: a signed-in
    // reader and a caller that both named the chart and asked to hear about the change.
    const commentEditor = isAuthenticated && chartId && onCommentChange ? { chartId, onSaved: onCommentChange } : null;

    const downloadButton = (imageRef: RefObject<HTMLDivElement | null>) => !isLoading ? (
        <ChartDownloadButton imageRef={imageRef} title={title} data={data} series={series} xAxisKey={xAxisKey} xAxisLabel={xAxisLabel} valueFormat={valueFormat} />
    ) : null;

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

    const expandButton =
        expandable && !isLoading ? (
            <button
                type="button"
                onClick={() => setIsExpanded(true)}
                aria-label={`${title} vergroten`}
                className="rounded-md p-1.5 text-fg-tertiary outline-focus-ring transition duration-100 ease-linear hover:bg-secondary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
            >
                <Expand06 className="size-5" aria-hidden="true" />
            </button>
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
                        {expandButton}
                    </div>
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

                                <div ref={chartRef}><ChartContent {...chartContentProps} /></div>
                                {table}
                            </>
                        )}
                    </div>
                </div>
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
                        <Modal className="max-w-6xl">
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
                                                className="rounded-md p-1.5 text-fg-tertiary outline-focus-ring transition duration-100 ease-linear hover:bg-secondary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
                                            >
                                                <XClose className="size-5" aria-hidden="true" />
                                            </button>
                                        </div>
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

                                            <div ref={expandedChartRef}><ChartContent {...chartContentProps} height={500} showPoints={showPoints} /></div>
                                            {table}
                                        </div>
                                    </div>
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
