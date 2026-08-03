import type { AnchorHTMLAttributes } from "react";
import { cx } from "@/utils/cx";

type AnchorProps = AnchorHTMLAttributes<HTMLAnchorElement>;

export function Anchor({ className, children, ...props }: AnchorProps) {
    return (
        <a
            className={cx(
                "text-brand-secondary underline decoration-brand-500/40 underline-offset-2 transition duration-100 ease-linear hover:decoration-brand-500",
                className,
            )}
            {...props}
        >
            {children}
        </a>
    );
}
