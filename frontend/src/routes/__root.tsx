import { Outlet, createRootRoute } from "@tanstack/react-router";
import { NotFoundPage } from "@/components/layout/not-found-page";
import { AuthProvider } from "@/features/auth";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "@/components/application/notifications/toaster";
import {
    AssistantRuntimeProvider,
    useLocalRuntime,
    type ChatModelAdapter,
} from "@assistant-ui/react";

const LM_STUDIO_BASE_URL = "http://localhost:1234/v1";

const lmStudioModelAdapter: ChatModelAdapter = {
    async *run({ messages, abortSignal }) {
        const openAiMessages = messages.map((msg) => ({
            role: msg.role,
            content:
                msg.content
                    ?.filter(
                        (part): part is { type: "text"; text: string } =>
                            part.type === "text",
                    )
                    .map((part) => part.text)
                    .join(" ") || "",
        }));

        const response = await fetch(
            `${LM_STUDIO_BASE_URL}/chat/completions`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "lm-studio",
                    messages: openAiMessages,
                    stream: true,
                }),
                signal: abortSignal,
            },
        );

        if (!response.ok) {
            throw new Error(
                `LM Studio request failed: ${response.status} ${response.statusText}`,
            );
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body from LM Studio");

        const decoder = new TextDecoder();
        let fullText = "";
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith("data: ")) continue;

                const data = trimmed.slice(6);
                if (data === "[DONE]") break;

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

export const Route = createRootRoute({
    component: RootComponent,
    notFoundComponent: NotFoundPage,
});

function RootComponent() {
    const runtime = useLocalRuntime(lmStudioModelAdapter);

    return (
        <ThemeProvider>
            <AuthProvider>
                <AssistantRuntimeProvider runtime={runtime}>
                    <Outlet />
                    <Toaster />
                </AssistantRuntimeProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}
