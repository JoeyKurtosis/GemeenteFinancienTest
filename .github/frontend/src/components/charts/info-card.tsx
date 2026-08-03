import { cx } from "@/utils/cx";

interface InfoCardProps {
    title: string;
    paragraphs: string[];
    className?: string;
}

export function InfoCard({ title, paragraphs, className }: InfoCardProps) {
    return (
        <div className={cx("rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset", className)}>
            <div className="px-5 pt-5 pb-1">
                <h3 className="text-md font-semibold text-primary">{title}</h3>
            </div>
            <div className="flex flex-col gap-3 px-5 pt-2 pb-5">
                {paragraphs.map((paragraph, index) => (
                    <p key={index} className="text-sm text-secondary">
                        {paragraph}
                    </p>
                ))}
            </div>
        </div>
    );
}
