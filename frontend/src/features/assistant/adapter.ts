import type { ChatModelAdapter } from "@assistant-ui/react";

/**
 * The assistant talks to our own Django endpoint, never to a model provider directly.
 *
 * The backend proxies to Gemini, keeps the API key server-side, and resolves the IV3 data
 * tools before it answers — so the bot quotes real figures instead of inventing them. The wire
 * format is OpenAI-shaped SSE, which is why this parser only has to read
 * `choices[0].delta.content`.
 *
 * Relative URL so the Vite dev proxy and nginx both route it, and `credentials: "include"` so
 * the session cookie rides along: the endpoint requires authentication, which is what stops
 * anonymous visitors spending the shared quota.
 */
const CHAT_ENDPOINT = "/api/chat/";

/** What the dashboard is currently showing, sent so "mijn gemeente" can mean something. */
export interface DashboardContext {
    /** CBS code, e.g. "GM0363" — the backend resolves it to a name for the year. */
    gemeente: string | null;
    jaar: number | null;
    /** Year-carrying verslagsoort code, e.g. "2024X000". */
    verslagsoort: string | null;
}

/**
 * Built as a factory rather than a constant so the adapter can read the live filter state.
 *
 * `getDashboard` is called at send time, not at creation time. That matters: the adapter is
 * created once and kept for the life of the runtime, while the filters change underneath it
 * every time the user applies a new selection.
 */
export function createAssistentAdapter(
    getDashboard: () => DashboardContext,
): ChatModelAdapter {
    return {
        async *run({ messages, abortSignal }) {
            const openAiMessages = messages
                .map((msg) => ({
                    role: msg.role,
                    content:
                        msg.content
                            ?.filter(
                                (part): part is { type: "text"; text: string } =>
                                    part.type === "text",
                            )
                            .map((part) => part.text)
                            .join(" ") || "",
                }))
                // A turn that produced no text carries nothing the model can use, and the
                // backend rejects the whole request if any message is empty. These do occur:
                // a turn that errored or was aborted leaves an empty assistant message in the
                // thread, which would otherwise poison every later send in that conversation.
                .filter((msg) => msg.content.trim());

            const response = await fetch(CHAT_ENDPOINT, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    // No `model`: the server picks it, so a client cannot select an expensive one.
                    messages: openAiMessages,
                    stream: true,
                    dashboard: getDashboard(),
                }),
                signal: abortSignal,
            });

            if (!response.ok) {
                // The backend sends a Dutch `detail` for the cases a user can act on — not
                // configured (503), busy (429), too long (400). Prefer it over the status line.
                const detail = await response
                    .json()
                    .then((body) => body?.detail)
                    .catch(() => null);
                throw new Error(
                    detail ||
                        `Assistent niet beschikbaar (${response.status} ${response.statusText})`,
                );
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error("Geen antwoord van de assistent");

            const decoder = new TextDecoder();
            let fullText = "";
            let buffer = "";
            let done = false;

            while (!done) {
                const { done: streamDone, value } = await reader.read();
                if (streamDone) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith("data: ")) continue;

                    const data = trimmed.slice(6);
                    if (data === "[DONE]") {
                        done = true;
                        break;
                    }

                    try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices?.[0]?.delta?.content;
                        if (delta) {
                            fullText += delta;
                            yield {
                                content: [{ type: "text" as const, text: fullText }],
                            };
                        }
                    } catch {
                        // skip malformed chunks
                    }
                }
            }
        },
    };
}
