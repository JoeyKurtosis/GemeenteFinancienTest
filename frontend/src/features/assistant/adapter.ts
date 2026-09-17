import type { ChatModelAdapter, ThreadMessage } from "@assistant-ui/react";
import { isAnswerEngineEnvelope, type AnswerEngineEnvelope } from "./types";

const CHAT_ENDPOINT = "/api/chat/";

export interface DashboardContext {
    gemeente: string | null;
}

interface SseEvent {
    event: string;
    data: string;
}

function parseEvent(block: string): SseEvent | null {
    let event = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
        if (!line || line.startsWith(":")) continue;
        const colon = line.indexOf(":");
        const field = colon === -1 ? line : line.slice(0, colon);
        const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
        if (field === "event") event = value;
        if (field === "data") data.push(value);
    }
    return data.length ? { event, data: data.join("\n") } : null;
}

export async function* parseSseStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
        while (true) {
            const { done, value } = await reader.read();
            // Normalize after appending: CRLF itself may be split across network chunks.
            buffer += decoder.decode(value, { stream: !done });
            buffer = buffer.replace(/\r\n/g, "\n");
            let boundary = buffer.indexOf("\n\n");
            while (boundary !== -1) {
                const event = parseEvent(buffer.slice(0, boundary));
                buffer = buffer.slice(boundary + 2);
                if (event) yield event;
                boundary = buffer.indexOf("\n\n");
            }
            if (done) break;
        }
        const event = parseEvent(buffer);
        if (event) yield event;
    } finally {
        reader.releaseLock();
    }
}

function textOf(message: ThreadMessage | undefined): string {
    return message?.content
        .filter((part): part is { type: "text"; text: string } => part.type === "text")
        .map((part) => part.text)
        .join(" ")
        .trim() ?? "";
}

function previousEnvelope(messages: readonly ThreadMessage[]): AnswerEngineEnvelope | null {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (message?.role !== "assistant") continue;
        const envelope = message.metadata.custom.answerEngine;
        if (isAnswerEngineEnvelope(envelope)) return envelope;
    }
    return null;
}

function envelopeText(envelope: AnswerEngineEnvelope): string {
    const claims = envelope.claims.map((claim) => claim.text.trim()).filter(Boolean).join("\n\n");
    if (claims) return claims;
    if (envelope.type === "refusal") {
        return envelope.refusal?.would_need || "Deze vraag kan ik niet beantwoorden.";
    }
    if (envelope.type === "unavailable") {
        return envelope.detail || "De assistent is tijdelijk niet beschikbaar.";
    }
    return "Er is geen tekstueel antwoord beschikbaar.";
}

export function createAssistentAdapter(getDashboard: () => DashboardContext): ChatModelAdapter {
    return {
        async *run({ messages, abortSignal, runConfig }) {
            const question = textOf([...messages].reverse().find((message) => message.role === "user"));
            if (!question) throw new Error("Voer een vraag in.");

            const previous = previousEnvelope(messages);
            const alternative = runConfig.custom?.alternative;
            const response = await fetch(CHAT_ENDPOINT, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question,
                    dashboard: getDashboard(),
                    resolved_context: previous?.resolved_context ?? null,
                    answer_ref: previous?.answer_ref ?? null,
                    alternative: typeof alternative === "string" ? alternative : null,
                }),
                signal: abortSignal,
            });

            if (!response.ok) {
                const detail = await response.json().then((body) => body?.detail).catch(() => null);
                throw new Error(detail || `Assistent niet beschikbaar (${response.status})`);
            }
            if (!response.body) throw new Error("Geen antwoord van de assistent.");

            let streamedText = "";
            let finalEnvelope: AnswerEngineEnvelope | null = null;
            for await (const frame of parseSseStream(response.body)) {
                if (frame.event === "token") {
                    const token = JSON.parse(frame.data) as { text?: unknown };
                    if (typeof token.text === "string") {
                        streamedText += token.text;
                        yield { content: [{ type: "text", text: streamedText }] };
                    }
                } else if (frame.event === "response") {
                    const envelope: unknown = JSON.parse(frame.data);
                    if (!isAnswerEngineEnvelope(envelope)) {
                        throw new Error("De assistent gaf een ongeldig antwoord.");
                    }
                    finalEnvelope = envelope;
                } else if (frame.event === "error") {
                    const error = JSON.parse(frame.data) as { detail?: unknown };
                    throw new Error(typeof error.detail === "string" ? error.detail : "De antwoordstream is afgebroken.");
                }
            }

            if (!finalEnvelope) throw new Error("De antwoordstream eindigde zonder resultaat.");
            yield {
                content: [{ type: "text", text: envelopeText(finalEnvelope) }],
                metadata: { custom: { answerEngine: finalEnvelope } },
            };
        },
    };
}
