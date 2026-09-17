import assert from "node:assert/strict";
import test from "node:test";
import { createAssistentAdapter, parseSseStream } from "./adapter";
import type { AnswerEngineEnvelope } from "./types";

const bytes = (parts: string[]) =>
    new ReadableStream<Uint8Array>({
        start(controller) {
            parts.forEach((part) => controller.enqueue(new TextEncoder().encode(part)));
            controller.close();
        },
    });

const envelope = (type: AnswerEngineEnvelope["type"] = "answer"): AnswerEngineEnvelope => ({
    type,
    language: "nl",
    disclosure: "Door AI gegenereerd.",
    data_as_of: "2026-01-01",
    resolved_context: { pack_version: "pack@0.2", entity: "GM0363" },
    context_labels: [],
    claims: [{ id: "c1", source: "data", text: "Het definitieve antwoord.", source_ref: {} }],
    suggestions: [],
    answer_ref: "next-answer",
    confidence: { band: "confident", factors: [] },
    result: { shape: "scalar", columns: [], rows: [] },
    trace: { sql: "must stay out of rendered text" },
});

test("SSE parser handles chunk boundaries, CRLF and keepalives", async () => {
    const events = [];
    for await (const event of parseSseStream(bytes([
        ": keepalive\r\nevent: meta\r\ndata: {\"request_id\":\"r1\"}\r\n\r",
        "\nevent: token\ndata: {\"text\":\"Hal\"}\n\n",
        "event: token\ndata: {\"text\":\"lo\"}\n\n",
    ]))) {
        events.push(event);
    }
    assert.deepEqual(events, [
        { event: "meta", data: '{"request_id":"r1"}' },
        { event: "token", data: '{"text":"Hal"}' },
        { event: "token", data: '{"text":"lo"}' },
    ]);
});

test("adapter replaces token text with the final envelope and resends opaque state", async () => {
    const previous = envelope();
    let sentBody: Record<string, unknown> | null = null;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input, init) => {
        sentBody = JSON.parse(String(init?.body));
        const final = JSON.stringify(envelope());
        return new Response(bytes([
            'event: token\ndata: {"text":"Tijdelijk"}\n\n',
            `event: response\ndata: ${final}\n\n`,
        ]), { status: 200, headers: { "Content-Type": "text/event-stream" } });
    };

    try {
        const adapter = createAssistentAdapter(() => ({ gemeente: "GM0363" }));
        const updates = [];
        const run = adapter.run({
            messages: [
                {
                    id: "a1",
                    role: "assistant",
                    content: [{ type: "text", text: "Eerder" }],
                    status: { type: "complete", reason: "stop" },
                    createdAt: new Date(),
                    metadata: {
                        unstable_state: null,
                        unstable_annotations: [],
                        unstable_data: [],
                        steps: [],
                        custom: { answerEngine: previous },
                    },
                },
                {
                    id: "u1",
                    role: "user",
                    content: [{ type: "text", text: "En nu?" }],
                    attachments: [],
                    createdAt: new Date(),
                    metadata: { custom: {} },
                },
            ],
            abortSignal: new AbortController().signal,
            runConfig: { custom: { alternative: "opaque-alternative" } },
            context: {},
            unstable_getMessage: () => { throw new Error("unused"); },
        } as never) as AsyncGenerator<unknown>;
        for await (const update of run) updates.push(update);

        assert.deepEqual(sentBody, {
            question: "En nu?",
            dashboard: { gemeente: "GM0363" },
            resolved_context: previous.resolved_context,
            answer_ref: "next-answer",
            alternative: "opaque-alternative",
        });
        assert.equal((updates[0] as { content: Array<{ text: string }> }).content[0]?.text, "Tijdelijk");
        assert.equal((updates[1] as { content: Array<{ text: string }> }).content[0]?.text, "Het definitieve antwoord.");
        assert.deepEqual(
            (updates[1] as { metadata: { custom: { answerEngine: AnswerEngineEnvelope } } }).metadata.custom.answerEngine.resolved_context,
            envelope().resolved_context,
        );
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("adapter rejects a stream without a final response envelope", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(bytes(['event: token\ndata: {"text":"Onvolledig"}\n\n']), { status: 200 });
    try {
        const adapter = createAssistentAdapter(() => ({ gemeente: null }));
        const run = adapter.run({
            messages: [{ role: "user", content: [{ type: "text", text: "Vraag" }] }],
            abortSignal: new AbortController().signal,
            runConfig: {},
        } as never) as AsyncGenerator<unknown>;
        await assert.rejects(async () => {
            for await (const _update of run) {
                // consume
            }
        }, /zonder resultaat/);
    } finally {
        globalThis.fetch = originalFetch;
    }
});
