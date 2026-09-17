import { type RefObject, useRef, useState } from "react";
import { Download01 } from "@untitledui/icons";
import { Button as AriaButton } from "react-aria-components";
import { toast } from "sonner";
import { IconNotification } from "@/components/application/notifications/notifications";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import type { ChartSeries } from "@/components/charts/chart-card";
import { buildChartSheet, chartFileName, downloadChartSheet } from "@/components/charts/chart-export";
import type { ValueFormat } from "@/components/charts/chart-format";
import { useFilterRegels, useFilters } from "@/features/filters";
import { cx } from "@/utils/cx";

interface ChartDownloadButtonProps {
    title: string;
    imageRef: RefObject<HTMLDivElement | null>;
    isDisabled?: boolean;
    data: Record<string, unknown>[];
    series: ChartSeries[];
    xAxisKey?: string;
    xAxisLabel?: string;
    valueFormat?: ValueFormat;
    /** See buildChartSheet — a normalised chart's data is amounts, not the shares it draws. */
    normalize?: boolean;
    shareBasis?: "row" | "column";
    totals?: number[];
    totalRow?: { label: string; values: (number | null | undefined)[] };
}

/** Exports the current chart as a spreadsheet or an image, entirely in the browser. */
export function ChartDownloadButton({
    title,
    imageRef,
    isDisabled = false,
    data,
    series,
    xAxisKey,
    xAxisLabel,
    valueFormat,
    normalize,
    shareBasis,
    totals,
    totalRow,
}: ChartDownloadButtonProps) {
    const busyRef = useRef(false);
    const [isBusy, setIsBusy] = useState(false);
    const { applied } = useFilters();
    const { regels } = useFilterRegels();

    // A chart still waiting on its first response has no figures to write.
    const isEmpty = isDisabled || data.length === 0 || series.length === 0;

    async function handleDownload(format: "xlsx" | "jpg") {
        if (busyRef.current || isEmpty) return;
        busyRef.current = true;
        setIsBusy(true);
        try {
            const gemeente = regels.find((regel) => regel.label === "Gemeente")?.waarde;
            const fileName = chartFileName(title, gemeente, applied.jaar);
            if (format === "xlsx") {
                const sheet = buildChartSheet({
                    title,
                    data,
                    series,
                    xAxisKey,
                    xAxisLabel,
                    valueFormat,
                    normalize,
                    shareBasis,
                    totals,
                    totalRow,
                    context: regels,
                });
                await downloadChartSheet(sheet, fileName);
            } else {
                const node = imageRef.current;
                if (!node) throw new Error("Grafiek is niet beschikbaar");
                const { downloadChartImage } = await import("@/components/charts/chart-image-export");
                await downloadChartImage(node, title, fileName.replace(/\.xlsx$/, ".jpg"));
            }
        } catch {
            // The app's own toast rather than sonner's default, which the Toaster does not style.
            toast.custom((id) => (
                <IconNotification
                    color="error"
                    title="Downloaden is niet gelukt"
                    description="Probeer het opnieuw."
                    hideDismissLabel
                    onClose={() => toast.dismiss(id)}
                />
            ));
        } finally {
            busyRef.current = false;
            setIsBusy(false);
        }
    }

    return (
        <Dropdown.Root>
            <AriaButton
                isDisabled={isBusy || isEmpty}
                aria-label={`${title} downloaden`}
                aria-busy={isBusy}
                className={cx(
                    "cursor-pointer rounded-md p-1.5 text-fg-tertiary outline-focus-ring transition duration-100 ease-linear hover:bg-secondary_hover focus-visible:outline-2 focus-visible:outline-offset-2",
                    (isBusy || isEmpty) && "cursor-not-allowed opacity-50",
                )}
            >
                <Download01 className="size-5" aria-hidden="true" />
            </AriaButton>
            <Dropdown.Popover className="w-52">
                <Dropdown.Menu
                    aria-label="Downloadformaat"
                    disabledKeys={isBusy || isEmpty ? ["xlsx", "jpg"] : []}
                    onAction={(key) => {
                        if (key === "xlsx" || key === "jpg") void handleDownload(key);
                    }}
                >
                    <Dropdown.Item id="xlsx">Excel (.xlsx)</Dropdown.Item>
                    <Dropdown.Item id="jpg">Afbeelding (.jpg)</Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown.Popover>
        </Dropdown.Root>
    );
}
