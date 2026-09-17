import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { cx, sortCx } from "@/utils/cx";

export interface SectionTab {
    label: string;
    href: string;
}

const styles = sortCx({
    /**
     * Lifted from the Untitled UI `Tabs` underline/md tab so these links render identically to
     * the tabs they replaced. React Aria's `isHovered` / `isFocusVisible` render props become
     * plain CSS variants here.
     */
    link: "flex h-max cursor-pointer items-center justify-center gap-1.5 border-b-2 border-transparent px-0.5 pt-0 pb-2.5 text-md font-semibold whitespace-nowrap text-quaternary outline-focus-ring transition duration-100 ease-linear hover:border-fg-brand-primary_alt hover:text-brand-secondary focus-visible:-outline-offset-2 focus-visible:outline-2",
    linkCurrent: "border-fg-brand-primary_alt text-brand-secondary",
});

interface SectionTabsProps {
    /** The links to render, in order. */
    items: SectionTab[];
    /** Accessible name for the `<nav>` landmark. Pass the section name so it reads apart from the breadcrumb nav. */
    label?: string;
}

/**
 * Underline-style sub-navigation for a dashboard section (Baten, Lasten, Begroting).
 *
 * These look like tabs but navigate to routes rather than swapping panels, so the markup is a
 * plain `nav > ul > li > Link` list and not a `role="tablist"`: React Aria's Tabs emitted
 * `aria-controls` pointing at TabPanels that were never rendered (WCAG 4.1.2).
 *
 * When the links overflow (e.g. the 10 Lasten taakvelden) the row stays horizontally
 * scrollable but the native scrollbar is hidden for a cleaner look; the current link is
 * scrolled into view so it's always visible after navigating.
 */
export function SectionTabs({ items, label = "Onderdelen" }: SectionTabsProps) {
    const { pathname } = useLocation();
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        ref.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ inline: "nearest", block: "nearest" });
    }, [pathname]);

    return (
        <nav ref={ref} aria-label={label} className="overflow-x-auto scrollbar-hide">
            {/* `w-max` makes the list as wide as its content, so the `before:` rail spans the whole
                scroll width rather than stopping at the edge of the visible area. */}
            <ul className="relative flex w-max gap-3 before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-border-secondary">
                {items.map((item) => {
                    const isCurrent = pathname === item.href;

                    return (
                        // z-index only applies to an unpositioned element when it's a flex item, and
                        // the <li> is the flex item here — this is what lifts the active 2px underline
                        // above the 1px rail drawn by the <ul>'s ::before.
                        <li key={item.href} className="z-10 flex">
                            <Link
                                to={item.href}
                                // The filters live in the query string; carry them across, as the
                                // sidebar's own links do, so switching pages keeps the view you had.
                                search={true}
                                // Link force-adds aria-current="page" whenever it considers itself
                                // active, and matching is a path *prefix* by default — without this,
                                // /lasten stays "current" on /lasten/veiligheid and the effect above
                                // would scroll the wrong link into view.
                                activeOptions={{ exact: true, includeSearch: false }}
                                className={cx(styles.link, isCurrent && styles.linkCurrent)}
                            >
                                <span className="flex items-center gap-1.5 px-0.5">{item.label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
