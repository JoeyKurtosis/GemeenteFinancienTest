import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import { useFilters } from "@/features/filters";
import { createAssistentAdapter, type DashboardContext } from "../adapter";
import type { AnswerEngineSuggestion, Capabilities } from "../types";

interface AssistantFeatures {
    starters: AnswerEngineSuggestion[];
    startersLoading: boolean;
    sendQuestion: (question: string, alternative?: string | null) => void;
}

const AssistantFeaturesContext = createContext<AssistantFeatures | null>(null);

export function useAssistantFeatures() {
    const value = useContext(AssistantFeaturesContext);
    if (!value) throw new Error("useAssistantFeatures must be used within AssistantProvider");
    return value;
}

export function AssistantProvider({ children }: { children: ReactNode }) {
    const { applied } = useFilters();
    const dashboardRef = useRef<DashboardContext>({ gemeente: null });
    dashboardRef.current = { gemeente: applied.gemeente };

    const runtime = useLocalRuntime(
        useMemo(() => createAssistentAdapter(() => dashboardRef.current), []),
    );
    const previousGemeente = useRef<string | null | undefined>(undefined);
    const [starters, setStarters] = useState<AnswerEngineSuggestion[]>([]);
    const [startersLoading, setStartersLoading] = useState(false);

    useEffect(() => {
        if (previousGemeente.current !== undefined && previousGemeente.current !== applied.gemeente) {
            runtime.thread.cancelRun();
            runtime.thread.reset();
        }
        previousGemeente.current = applied.gemeente;

        const controller = new AbortController();
        setStarters([]);
        if (!applied.gemeente) {
            setStartersLoading(false);
            return () => controller.abort();
        }

        setStartersLoading(true);
        fetch(`/api/chat/capabilities/?gemeente=${encodeURIComponent(applied.gemeente)}`, {
            credentials: "include",
            signal: controller.signal,
        })
            .then(async (response) => {
                if (!response.ok) throw new Error("Suggesties konden niet worden geladen.");
                return response.json() as Promise<Capabilities>;
            })
            .then((capabilities) => setStarters(Array.isArray(capabilities.starters) ? capabilities.starters : []))
            .catch((error: unknown) => {
                if (!(error instanceof DOMException && error.name === "AbortError")) setStarters([]);
            })
            .finally(() => {
                if (!controller.signal.aborted) setStartersLoading(false);
            });
        return () => controller.abort();
    }, [applied.gemeente, runtime]);

    const sendQuestion = useCallback(
        (question: string, alternative?: string | null) => {
            runtime.thread.append({
                role: "user",
                content: [{ type: "text", text: question }],
                runConfig: alternative ? { custom: { alternative } } : undefined,
            });
        },
        [runtime],
    );

    const features = useMemo(
        () => ({ starters, startersLoading, sendQuestion }),
        [starters, startersLoading, sendQuestion],
    );

    return (
        <AssistantRuntimeProvider runtime={runtime}>
            <AssistantFeaturesContext value={features}>{children}</AssistantFeaturesContext>
        </AssistantRuntimeProvider>
    );
}
