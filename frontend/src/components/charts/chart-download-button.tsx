import { useState } from "react";
import { Download01 } from "@untitledui/icons";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button as AriaButton } from "react-aria-components";
import { IconNotification } from "@/components/application/notifications/notifications";
import { Tooltip } from "@/components/base/tooltip/tooltip";
import { buildChartSheet, chartFileName, downloadChartSheet } from "@/components/charts/chart-export";
import type { ChartSeries, ValueFormat } from "@/components/charts/chart-card";
import { useAuth } from "@/features/auth";
import { useFilterRegels, useFilters } from "@/features/filters";
import { cx } from "@/utils/cx";

interface ChartDownloadButtonProps {
    title: string;
    data: Record<string, unknown>[];
    series: ChartSeries[];
    xAxisKey?: string;
    xAxisLabel?: string;
    valueFormat?: ValueFormat;
    /** See buildChartSheet — a normalised chart's data is amounts, not the shares it draws. */
    normalize?: boolean;
    totals?: number[];
    totalRow?: { label: string; values: (number | null | undefined)[] };
}

/**
 * Downloads the chart's figures as an Excel file.
 *
 * Sits beside the notitie and vergroot buttons in the card header and is styled as they are — one
 * icon button, no menu: there is a single format, so a dropdown would only add a click.
 *
 * Everything it writes comes from the props the card already holds. Nothing is fetched, so the
 * sheet is by construction the same figures that are drawn above it.
 *
 * Downloading is for account holders. Visitors without one keep the button — hiding it would hide
 * that the feature exists — but pressing it takes them to the login page instead of writing a file.
 */
export function ChartDownloadButton({ title, data, series, xAxisKey, xAxisLabel, valueFormat, normalize, totals, totalRow }: ChartDownloadButtonProps) {
    const [isBusy, setIsBusy] = useState(false);
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const { applied } = useFilters();
    const { regels } = useFilterRegels();

    // A chart still waiting on its first response has no figures to write.
    const isEmpty = data.length === 0 || series.length === 0;

    async function handleDownload() {
        setIsBusy(true);
        try {
            const sheet = buildChartSheet({ title, data, series, xAxisKey, xAxisLabel, valueFormat, normalize, totals, totalRow, context: regels });
            // The gemeente is named in `regels` already; taken from there so the filename and the
            // sheet's header cannot name different gemeenten.
            const gemeente = regels.find((regel) => regel.label === "Gemeente")?.waarde;
            await downloadChartSheet(sheet, chartFileName(title, gemeente, applied.jaar));
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
            setIsBusy(false);
        }
    }

    if (!isAuthenticated) {
        return (
            <Tooltip title="Log in om te downloaden" placement="top">
                <AriaButton
                    onPress={() => navigate({ to: "/login" })}
                    aria-label="Log in om te downloaden"
                    className="rounded-md p-1.5 text-fg-quaternary transition duration-100 ease-linear hover:bg-secondary_hover hover:text-fg-quaternary_hover"
                >
                    <Download01 className="size-5" aria-hidden="true" />
                </AriaButton>
            </Tooltip>
        );
    }

    return (
        <AriaButton
            onPress={handleDownload}
            isDisabled={isBusy || isEmpty}
            aria-label="Download als Excel"
            className={cx(
                "rounded-md p-1.5 text-fg-quaternary transition duration-100 ease-linear hover:bg-secondary_hover hover:text-fg-quaternary_hover",
                (isBusy || isEmpty) && "cursor-not-allowed opacity-50",
            )}
        >
            <Download01 className="size-5" aria-hidden="true" />
        </AriaButton>
    );
}
