import { type RefObject, useEffect, useRef, useState } from "react";
import { Edit05, Expand06, MessageChatSquare, XClose } from "@untitledui/icons";
import { ChartLegendContent } from "@/components/application/charts/charts-base";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { ChartDownloadButton } from "@/components/charts/chart-download-button";
import { ChartDataTable } from "@/components/charts/chart-data-table";
import { DonutChart, type DonutSlice } from "@/components/charts/donut-chart";
import { DonutSkeleton } from "@/components/charts/donut-skeleton";
import { useAuth } from "@/features/auth";
import type { ChartComment } from "@/features/comments";
import { ChartCommentButton, formatCommentDate, useChartAnchor } from "@/features/comments";
import { cx } from "@/utils/cx";

export interface DonutSide {
    /** Supporting label under the centre total (e.g. "Aa en Hunze"). */
    label: string;
    /** Centre total (e.g. "€ 656"). */
    centerValue: string;
    /**
     * The same total as a number, for the Excel export's Totaal row. The measured one — adding the
     * slices up gives a different figure, since each is rounded on its way here.
     */
    totaal?: number | null;
    data: DonutSlice[];
}

interface DonutComparisonCardProps {
    title: string;
    /** Shared legend entries (both donuts use the same categories/colors). */
    categories: { name: string; color: string }[];
    /** Null while the figures are still on their way — the card draws its skeleton instead. */
    left: DonutSide | null;
    right: DonutSide | null;
    /** Show the skeleton rather than the rings. Implied by a missing side. */
    isLoading?: boolean;
    expandable?: boolean;
    className?: string;
    /** Stable identifier for the comment system (e.g. "lasten:Verdeling lasten:3"). */
    chartId?: string;
    /** The user's existing comment for this chart, if any. */
    comment?: ChartComment;
    /** Called after a comment is saved or deleted to refresh the cache. */
    onCommentChange?: () => void;
}

function Donuts({
    left,
    right,
    categories,
    height,
    showSliceLabels,
}: {
    left: DonutSide;
    right: DonutSide;
    categories: { name: string; color: string }[];
    height?: number;
    showSliceLabels?: boolean;
}) {
    // Clicking a legend row singles that category out on both rings at once — the two are
    // read against each other, so fading one side alone would defeat the comparison.
    // Clicking it again, or clicking another row, moves the highlight. Nothing is filtered
    // out: the centre totals and tooltips still answer for every slice.
    const [highlighted, setHighlighted] = useState<string | null>(null);
    // Derived rather than stored: the categories change under the page's filters, and a
    // highlight left pointing at a departed one would fade every slice while singling out none.
    const activeKey = highlighted !== null && categories.some((c) => c.name === highlighted) ? highlighted : null;

    return (
        <div className="@container/donuts min-w-0">
            <div className="flex min-w-0 flex-col gap-6 @[1280px]/donuts:flex-row @[1280px]/donuts:items-center">
                <div
                    role="region"
                    aria-label="Legenda"
                    tabIndex={0}
                    className="min-w-0 overflow-y-auto rounded-sm pr-2 outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2 @[1280px]/donuts:max-w-56 @[1280px]/donuts:shrink-0"
                    style={{ maxHeight: height ?? 240 }}
                >
                    <ChartLegendContent
                        payload={categories.map((c) => ({ value: c.name, color: c.color, dataKey: c.name, type: "square" }))}
                        layout="vertical"
                        activeKey={activeKey}
                        onItemClick={(key) => setHighlighted((current) => (current === key ? null : key))}
                        className="min-w-0 flex-row flex-wrap gap-x-4 gap-y-1.5 pl-0 [overflow-wrap:anywhere] @[1280px]/donuts:flex-col @[1280px]/donuts:flex-nowrap [&>li]:max-w-full"
                    />
                </div>
                <div className="grid min-w-0 flex-1 grid-cols-1 gap-6 @[960px]/donuts:grid-cols-2">
                    <DonutChart
                        data={left.data}
                        centerValue={left.centerValue}
                        centerLabel={left.label}
                        activeKey={activeKey}
                        height={height}
                        showSliceLabels={showSliceLabels}
                    />
                    <DonutChart
                        data={right.data}
                        centerValue={right.centerValue}
                        centerLabel={right.label}
                        activeKey={activeKey}
                        height={height}
                        showSliceLabels={showSliceLabels}
                    />
                </div>
            </div>
        </div>
    );
}

export function DonutComparisonCard({
    title,
    categories,
    left,
    right,
    isLoading = false,
    expandable = false,
    className,
    chartId,
    comment,
    onCommentChange,
}: DonutComparisonCardProps) {
    const chartRef = useRef<HTMLDivElement>(null);
    const expandedChartRef = useRef<HTMLDivElement>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const { isAuthenticated } = useAuth();
    // A side arriving null is the same state as isLoading, and the one the type can prove: below
    // this line there are two donuts to draw, or there is a skeleton.
    const laadt = isLoading || !left || !right;
    // Lets a note in het notities-overzicht link back to this exact card — held off until the
    // figures are in, so the scroll lands on a card that is already its full height.
    const { ref: anchorRef, anchorId, shouldExpand } = useChartAnchor(chartId, laadt);

    useEffect(() => {
        if (shouldExpand && expandable) setIsExpanded(true);
    }, [shouldExpand, expandable]);

    // What a comment button needs, or null where this chart has no note to write: a signed-in
    // reader and a caller that both named the chart and asked to hear about the change.
    const commentEditor = isAuthenticated && chartId && onCommentChange ? { chartId, onSaved: onCommentChange } : null;

    // Two rings read as one table: a row per category, a column per side. The slices carry no key
    // of their own — the shared name is what ties a slice on the left ring to its twin on the
    // right, the same thing the legend is built on.
    const waarde = (zijde: DonutSide, naam: string) => zijde.data.find((slice) => slice.name === naam)?.value ?? null;
    const table = left && right && (
        <ChartDataTable
            title={title}
            xAxisLabel="Categorie"
            data={categories.map((categorie) => ({ name: categorie.name, links: waarde(left, categorie.name), rechts: waarde(right, categorie.name) }))}
            series={[{ key: "links", name: left.label, color: "" }, { key: "rechts", name: right.label, color: "" }]}
            totalRow={{ label: "Totaal", values: [left.totaal, right.totaal] }}
        />
    );
    const downloadButton = (imageRef: RefObject<HTMLDivElement | null>) =>
        !laadt && left && right ? (
            <ChartDownloadButton
                imageRef={imageRef}
                isDisabled={left.data.length === 0 || right.data.length === 0}
                title={title}
                data={categories.map((categorie) => ({ name: categorie.name, links: waarde(left, categorie.name), rechts: waarde(right, categorie.name) }))}
                series={[
                    { key: "links", name: left.label, color: "" },
                    { key: "rechts", name: right.label, color: "" },
                ]}
                shareBasis="column"
                totalRow={{ label: "Totaal", values: [left.totaal, right.totaal] }}
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
                    {/* Nothing to download, comment on or enlarge until there is a chart. */}
                    <div className="flex shrink-0 items-center gap-1">
                        {commentEditor && !laadt && <ChartCommentButton {...commentEditor} comment={comment} />}
                        {downloadButton(chartRef)}
                        {expandable && !laadt && (
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
                {/* Taller than a plain chart card: the ring is sized off the shorter of the two
                    axes, so height is what buys the rings their radius back from the slice labels. */}
                <div className="px-5 pt-3 pb-5">
                    {laadt ? <DonutSkeleton height={320} /> : <div ref={chartRef}><Donuts left={left} right={right} categories={categories} height={320} showSliceLabels /></div>}
                    {!laadt && table}
                </div>
            </div>

            {expandable && !laadt && (
                <DialogTrigger isOpen={isExpanded} onOpenChange={setIsExpanded}>
                    <ModalOverlay>
                        {/* Wider than the other expanded charts: the slice labels sit beside the
                            rings, so the width they take is width the rings do not get. */}
                        <Modal className="max-w-7xl">
                            <Dialog aria-label={title} className="flex-col">
                                <div className="w-full rounded-xl bg-primary p-6 shadow-lg">
                                    <div className="mb-4 flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-primary">{title}</h3>
                                        <div className="flex shrink-0 items-center gap-1">
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
                                    <div ref={expandedChartRef}><Donuts left={left} right={right} categories={categories} height={360} showSliceLabels /></div>
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
