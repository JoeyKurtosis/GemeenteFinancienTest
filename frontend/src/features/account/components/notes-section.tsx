import { Link } from "@tanstack/react-router";
import { ArrowRight, MessageChatSquare } from "@untitledui/icons";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Badge } from "@/components/base/badges/badges";
import { type ChartComment, describeChartId, formatCommentDate, useMyComments } from "@/features/comments";

/**
 * Every note the user has written, newest first, each one linking back to the chart it sits on.
 *
 * A note only knows the chart id it was stored against, so `describeChartId` does the reading
 * back to a page and a heading. An id it can't place (a renamed chart, a retired page) still
 * gets a row — with its raw id and no link — rather than disappearing.
 */
export function NotesSection() {
    const { comments, isLoading, error } = useMyComments();

    if (isLoading) {
        return (
            <div className="flex justify-center py-16">
                <LoadingIndicator type="line-simple" size="md" label="Notities laden..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary ring-inset">
                <p className="text-md font-semibold text-primary">Je notities konden niet worden opgehaald.</p>
                <p className="pt-1 text-sm text-tertiary">Probeer de pagina opnieuw te laden.</p>
            </div>
        );
    }

    if (comments.length === 0) {
        return (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-secondary py-16 text-center">
                <h2 className="text-lg font-semibold text-primary">Nog geen notities</h2>
                <p className="max-w-sm text-sm text-tertiary">
                    Klik op het notitie-icoon rechtsboven in een grafiek om er iets bij te schrijven. Je notities verschijnen hier.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-primary">Mijn notities</h2>
            </div>

            <hr className="border-secondary" />

            <ul className="flex flex-col gap-4">
                {comments.map((comment) => (
                    <li key={comment.id}>
                        <NoteCard comment={comment} />
                    </li>
                ))}
            </ul>
        </div>
    );
}

function NoteCard({ comment }: { comment: ChartComment }) {
    const { pageLabel, chartTitle, to, anchor } = describeChartId(comment.chart_id);

    return (
        <div className="flex flex-col gap-3 rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary ring-inset">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                    <Badge size="sm" color="brand" type="pill-color">
                        {pageLabel}
                    </Badge>
                    <h3 className="text-sm font-semibold text-primary">{chartTitle}</h3>
                </div>

                {/* `search: true` carries the applied filters across, as every other in-app link
                    does; the hash scrolls the card into view once the page is there. */}
                {to && (
                    <Link
                        to={to}
                        search={true}
                        hash={anchor}
                        className="flex items-center gap-1.5 text-sm font-semibold text-brand-secondary transition duration-100 ease-linear hover:text-brand-secondary_hover"
                    >
                        Bekijk grafiek
                        <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                )}
            </div>

            <div className="flex gap-2 rounded-lg bg-secondary p-3">
                <MessageChatSquare className="mt-0.5 size-4 shrink-0 text-brand-secondary" aria-hidden="true" />
                <p className="text-sm whitespace-pre-wrap text-secondary">{comment.text}</p>
            </div>

            <p className="text-xs text-tertiary">Bijgewerkt op {formatCommentDate(comment.updated_at)}</p>
        </div>
    );
}
