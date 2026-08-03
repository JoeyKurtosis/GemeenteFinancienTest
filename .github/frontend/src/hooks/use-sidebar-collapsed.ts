import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ui-sidebar-collapsed";

function readInitial(): boolean {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "true";
}

/**
 * Persisted collapsed/expanded state for the desktop app sidebar. The choice is
 * stored in `localStorage` so it survives reloads, mirroring the theme handling.
 */
export function useSidebarCollapsed() {
    const [collapsed, setCollapsedState] = useState<boolean>(readInitial);

    useEffect(() => {
        window.localStorage.setItem(STORAGE_KEY, String(collapsed));
    }, [collapsed]);

    const setCollapsed = useCallback((value: boolean) => setCollapsedState(value), []);
    const toggle = useCallback(() => setCollapsedState((prev) => !prev), []);

    return { collapsed, setCollapsed, toggle };
}
