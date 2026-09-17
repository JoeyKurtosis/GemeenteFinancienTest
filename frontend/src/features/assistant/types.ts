export type ResultShape = "scalar" | "timeseries" | "ranking" | "comparison" | "correlation" | "none";

export interface AnswerEngineSuggestion {
    question: string;
    shape: ResultShape;
    metric: string | null;
    kind: string | null;
    token: string | null;
}

export interface AnswerEngineClaim {
    id: string;
    source: "data" | "definition" | "method" | "guardrail";
    text: string;
    source_ref: Record<string, unknown>;
}

export interface AnswerEngineColumn {
    name: string;
    role: "dimension" | "measure";
    unit: string | null;
    label: string | null;
    normalised: boolean;
}

export interface AnswerEngineEnvelope {
    type: "answer" | "refusal" | "conversation" | "unavailable";
    language: "nl";
    disclosure: string;
    data_as_of: string | null;
    resolved_context: Record<string, unknown>;
    context_labels: Array<{
        key: string;
        value: string;
        label: string | null;
        chosen_by_engine: boolean;
    }>;
    claims: AnswerEngineClaim[];
    suggestions: AnswerEngineSuggestion[];
    answer_ref: string | null;
    confidence?: {
        band: "confident" | "caveated" | "refused";
        factors: string[];
    };
    result?: {
        shape: ResultShape;
        columns: AnswerEngineColumn[];
        rows: unknown[][];
    };
    refusal?: {
        reason: string;
        would_need: string | null;
        instead: AnswerEngineSuggestion[];
        agency: "reader" | "provider" | "nobody" | null;
    };
    conversation?: { kind: string; glossary: string[] };
    unavailable?: { cause: string; retry_after_seconds: number | null };
    detail?: string | null;
    trace: Record<string, unknown>;
}

export interface Capabilities {
    pack: string;
    pack_version: string;
    starters: AnswerEngineSuggestion[];
}

export const isAnswerEngineEnvelope = (value: unknown): value is AnswerEngineEnvelope => {
    if (!value || typeof value !== "object") return false;
    const envelope = value as Partial<AnswerEngineEnvelope>;
    return (
        ["answer", "refusal", "conversation", "unavailable"].includes(envelope.type ?? "") &&
        envelope.language === "nl" &&
        typeof envelope.disclosure === "string" &&
        Array.isArray(envelope.claims) &&
        Array.isArray(envelope.suggestions) &&
        Array.isArray(envelope.context_labels) &&
        envelope.resolved_context !== null &&
        typeof envelope.resolved_context === "object"
    );
};
