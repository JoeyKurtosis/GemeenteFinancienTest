import { useMemo, useRef, type ReactNode } from "react";
import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import { useFilters } from "@/features/filters";
import { createAssistentAdapter, type DashboardContext } from "../adapter";

/**
 * Creates the chat runtime, and feeds it the filters the user currently has applied.
 *
 * Must be mounted *inside* FiltersProvider — that is the whole point of it being a separate
 * component. The runtime used to be created in `__root.tsx`, which sits above the provider,
 * so the adapter had no way to reach the filter state at all.
 */
export function AssistantProvider({ children }: { children: ReactNode }) {
    const { applied } = useFilters();

    // The adapter is created once and kept for the life of the runtime, so it cannot close
    // over `applied` directly — it would answer every question using whatever was selected
    // when the page loaded. A ref rewritten each render gives it the value at send time.
    const dashboardRef = useRef<DashboardContext>({
        gemeente: null,
        jaar: null,
        verslagsoort: null,
    });
    dashboardRef.current = {
        gemeente: applied.gemeente,
        jaar: applied.jaar,
        verslagsoort: applied.verslagsoort,
    };

    const runtime = useLocalRuntime(
        useMemo(() => createAssistentAdapter(() => dashboardRef.current), []),
    );

    return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
