import { cx } from "@/utils/cx";

interface ResultRow {
    label: string;
    inkomsten: string;
    uitgaven: string;
    resultaat: string;
}

interface ResultCardProps {
    title: string;
    rows: ResultRow[];
    isLoading?: boolean;
    className?: string;
}

/**
 * Rows the card stands in for while the figures load: a gemeente and its referentiegroep, or
 * the two report types on a comparison page. Only used on a first load, when there is nothing
 * to count — a refetch keeps the rows it already has and the card holds its height.
 */
const PLACEHOLDER_ROWS = 2;

/** The table's own rows, drawn as bars. Kept on the real table so nothing shifts when it fills. */
function SkeletonRows({ count }: { count: number }) {
    return Array.from({ length: count }, (_, index) => (
        <tr key={index} className="border-t border-tertiary" aria-hidden="true">
            <td className="py-4 pr-4">
                <div className="h-4 w-24 animate-pulse rounded-md bg-secondary" />
            </td>
            <td className="py-4">
                <div className="mx-auto h-6 w-20 animate-pulse rounded-md bg-secondary" />
            </td>
            <td className="py-4 text-center text-lg text-tertiary">−</td>
            <td className="py-4">
                <div className="mx-auto h-6 w-20 animate-pulse rounded-md bg-secondary" />
            </td>
            <td className="py-4 text-center text-lg text-tertiary">=</td>
            <td className="py-4">
                <div className="mx-auto h-6 w-20 animate-pulse rounded-md bg-secondary" />
            </td>
        </tr>
    ));
}

export function ResultCard({ title, rows, isLoading = false, className }: ResultCardProps) {
    return (
        <div className={cx("rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset", className)}>
            <div className="px-5 pt-5 pb-2">
                <h3 className="text-md font-semibold text-primary">{title}</h3>
            </div>
            <div className="px-5 pb-5">
                <table className="w-full" aria-busy={isLoading}>
                    <thead>
                        <tr>
                            <th className="pb-3 text-left text-sm font-normal text-tertiary">
                                <span className="sr-only">Groep</span>
                            </th>
                            <th className="pb-3 text-center text-sm font-normal text-tertiary">Inkomsten</th>
                            <th className="pb-3 text-center text-sm font-normal text-tertiary">
                                <span className="sr-only">minus</span>
                            </th>
                            <th className="pb-3 text-center text-sm font-normal text-tertiary">Uitgaven</th>
                            <th className="pb-3 text-center text-sm font-normal text-tertiary">
                                <span className="sr-only">is</span>
                            </th>
                            <th className="pb-3 text-center text-sm font-normal text-tertiary">Resultaat</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && <SkeletonRows count={rows.length || PLACEHOLDER_ROWS} />}
                        {!isLoading &&
                            rows.map((row) => (
                                <tr key={row.label} className="border-t border-tertiary">
                                    <td className="py-4 pr-4 text-sm font-medium text-secondary">{row.label}</td>
                                    <td className="py-4 text-center text-display-xs font-semibold text-primary">{row.inkomsten}</td>
                                    <td className="py-4 text-center text-lg text-tertiary">−</td>
                                    <td className="py-4 text-center text-display-xs font-semibold text-primary">{row.uitgaven}</td>
                                    <td className="py-4 text-center text-lg text-tertiary">=</td>
                                    <td className="py-4 text-center text-display-xs font-semibold text-primary">{row.resultaat}</td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
