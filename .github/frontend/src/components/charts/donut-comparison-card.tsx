import { useState } from "react";
import { Expand06, XClose } from "@untitledui/icons";
import { ChartLegendContent } from "@/components/application/charts/charts-base";
import { DonutChart, type DonutSlice } from "@/components/charts/donut-chart";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { cx } from "@/utils/cx";

export interface DonutSide {
    /** Supporting label under the centre total (e.g. "Aa en Hunze"). */
    label: string;
    /** Centre total (e.g. "€ 656"). */
    centerValue: string;
    data: DonutSlice[];
}

interface DonutComparisonCardProps {
    title: string;
    /** Shared legend entries (both donuts use the same categories/colors). */
    categories: { name: string; color: string }[];
    left: DonutSide;
    right: DonutSide;
    expandable?: boolean;
    className?: string;
}

function Donuts({ left, right, categories, height }: { left: DonutSide; right: DonutSide; categories: { name: string; color: string }[]; height?: number }) {
    // Clicking a legend row singles that category out on both rings at once — the two are
    // read against each other, so fading one side alone would defeat the comparison.
    // Clicking it again, or clicking another row, moves the highlight. Nothing is filtered
    // out: the centre totals and tooltips still answer for every slice.
    const [highlighted, setHighlighted] = useState<string | null>(null);
    // Derived rather than stored: the categories change under the page's filters, and a
    // highlight left pointing at a departed one would fade every slice while singling out none.
    const activeKey = highlighted !== null && categories.some((c) => c.name === highlighted) ? highlighted : null;

    return (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            {/* Slices carry no key of their own — the shared name is what ties a legend row
                to a slice on either ring. */}
            <ChartLegendContent
                payload={categories.map((c) => ({ value: c.name, color: c.color, dataKey: c.name, type: "square" }))}
                layout="vertical"
                activeKey={activeKey}
                onItemClick={(key) => setHighlighted((current) => (current === key ? null : key))}
                className="gap-1.5 pl-0"
            />
            <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2">
                <DonutChart data={left.data} centerValue={left.centerValue} centerLabel={left.label} activeKey={activeKey} height={height} />
                <DonutChart data={right.data} centerValue={right.centerValue} centerLabel={right.label} activeKey={activeKey} height={height} />
            </div>
        </div>
    );
}

export function DonutComparisonCard({ title, categories, left, right, expandable = false, className }: DonutComparisonCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <>
            <div className={cx("rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset", className)}>
                <div className="flex items-center justify-between px-5 pt-5 pb-1">
                    <h3 className="text-md font-semibold text-primary">{title}</h3>
                    {expandable && (
                        <button
                            type="button"
                            onClick={() => setIsExpanded(true)}
                            className="rounded-md p-1.5 text-fg-quaternary transition duration-100 ease-linear hover:bg-secondary_hover hover:text-fg-quaternary_hover"
                        >
                            <Expand06 className="size-5" aria-hidden="true" />
                        </button>
                    )}
                </div>
                <div className="px-5 pt-3 pb-5">
                    <Donuts left={left} right={right} categories={categories} />
                </div>
            </div>

            {expandable && (
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
                                    <Donuts left={left} right={right} categories={categories} height={360} />
                                </div>
                            </Dialog>
                        </Modal>
                    </ModalOverlay>
                </DialogTrigger>
            )}
        </>
    );
}
