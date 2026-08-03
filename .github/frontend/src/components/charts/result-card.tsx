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
    className?: string;
}

export function ResultCard({ title, rows, className }: ResultCardProps) {
    return (
        <div className={cx("rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset", className)}>
            <div className="px-5 pt-5 pb-2">
                <h3 className="text-md font-semibold text-primary">{title}</h3>
            </div>
            <div className="px-5 pb-5">
                <table className="w-full">
                    <thead>
                        <tr>
                            <th className="pb-3 text-left text-sm font-normal text-tertiary"><span className="sr-only">Groep</span></th>
                            <th className="pb-3 text-center text-sm font-normal text-tertiary">Inkomsten</th>
                            <th className="pb-3 text-center text-sm font-normal text-tertiary"><span className="sr-only">minus</span></th>
                            <th className="pb-3 text-center text-sm font-normal text-tertiary">Uitgaven</th>
                            <th className="pb-3 text-center text-sm font-normal text-tertiary"><span className="sr-only">is</span></th>
                            <th className="pb-3 text-center text-sm font-normal text-tertiary">Resultaat</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
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
