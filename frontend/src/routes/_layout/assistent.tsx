import { createFileRoute } from "@tanstack/react-router";
import { Thread } from "@/components/assistant-ui/thread";

function AssistantWelcome() {
    return (
        <div className="aui-thread-welcome mb-6 flex flex-col items-center text-center">
            <h2 className="text-2xl font-semibold text-foreground">Hoe kan ik u helpen?</h2>
        </div>
    );
}

const pageComponents = { Welcome: AssistantWelcome };

function AssistantPage() {
    return (
        <section
            aria-label="Chat met Kompas AI"
            className="aui-root flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-popover text-popover-foreground [&>.aui-thread-root]:bg-inherit [&>.aui-thread-root_.aui-thread-viewport-footer]:bg-inherit"
        >
            <Thread maxWidth="850px" components={pageComponents} />
        </section>
    );
}

export const Route = createFileRoute("/_layout/assistent")({
    component: AssistantPage,
    context: () => ({
        title: "Kompas AI",
        description: "Stel vragen over de financiën van jouw gemeente",
        showBreadCrumbs: false,
    }),
});
