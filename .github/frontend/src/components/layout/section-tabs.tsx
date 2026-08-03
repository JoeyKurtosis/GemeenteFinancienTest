import { useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Tabs } from "@/components/application/tabs/tabs";

export interface SectionTab {
    label: string;
    href: string;
}

/**
 * Underline-style tab navigation for a dashboard section (Baten, Lasten), built on the
 * Untitled UI Tabs component. The selected tab is driven by the current pathname and
 * selecting a tab navigates to that route.
 *
 * When the tabs overflow (e.g. the 10 Lasten taakvelden) the row stays horizontally
 * scrollable but the native scrollbar is hidden for a cleaner look; the active tab is
 * scrolled into view so it's always visible after navigating.
 */
export function SectionTabs({ items }: { items: SectionTab[] }) {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        ref.current
            ?.querySelector('[role="tab"][data-selected="true"]')
            ?.scrollIntoView({ inline: "nearest", block: "nearest" });
    }, [pathname]);

    return (
        <div ref={ref} className="overflow-x-auto scrollbar-hide">
            <Tabs
                selectedKey={pathname}
                onSelectionChange={(key) => {
                    const href = String(key);
                    // `search: true` carries the query string across, as the sidebar's own
                    // links do: the applied filters live there, so navigating without it
                    // resets every select the moment you switch tabs.
                    if (href !== pathname) navigate({ to: href, search: true });
                }}
                className="w-max"
            >
                <Tabs.List type="underline" size="md">
                    {items.map((item) => (
                        <Tabs.Item key={item.href} id={item.href} label={item.label} />
                    ))}
                </Tabs.List>
            </Tabs>
        </div>
    );
}
