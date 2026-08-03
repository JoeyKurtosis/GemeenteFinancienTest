import { useEffect } from "react";

const BRAND = "GemeenteFinancien";

/**
 * Keeps `document.title` in sync with the active route title using the
 * `GemeenteFinancien | <page>` template. Falls back to the brand name alone
 * when no page title is available (or when it would duplicate the brand).
 */
export function useDocumentTitle(title?: string) {
    useEffect(() => {
        const trimmed = title?.trim();
        const normalized = trimmed?.replace(/ë/g, "e");

        document.title = trimmed && normalized?.toLowerCase() !== BRAND.toLowerCase() ? `${BRAND} | ${trimmed}` : BRAND;
    }, [title]);
}
