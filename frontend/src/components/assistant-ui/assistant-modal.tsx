"use client";

import { type FC, forwardRef, useEffect, useRef, useState } from "react";
import { AssistantModalPrimitive } from "@assistant-ui/react";
import { Link } from "@tanstack/react-router";
import { CompassIcon, ChevronDownIcon, Maximize2Icon } from "lucide-react";
import { Thread } from "@/components/assistant-ui/thread";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";

const WELCOME_STORAGE_KEY = "gemeentefinancien:assistant-welcome:v1";
// Remember the introduction during this session even if browser storage is unavailable.
let welcomeShownThisSession = false;

function AssistantIntroduction() {
    return (
        <div className="aui-thread-welcome-root mb-6 flex flex-col gap-3 px-4 text-center">
            <h2 className="text-xl font-semibold">Welkom bij Kompas AI</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
                Ik ben Kompas AI, je AI-assistent bij Dashboard Gemeentefinanciën. Dit dashboard geeft inzicht in de inkomsten en uitgaven van gemeentes.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">Stel hieronder je vraag om te beginnen.</p>
        </div>
    );
}

const introductionComponents = { Welcome: AssistantIntroduction };

export const AssistantModal: FC = () => {
    const [open, setOpen] = useState(false);
    const [showIntroduction, setShowIntroduction] = useState(false);
    const checkedWelcome = useRef(false);

    useEffect(() => {
        if (checkedWelcome.current) return;
        checkedWelcome.current = true;
        if (welcomeShownThisSession) return;
        try {
            if (window.localStorage.getItem(WELCOME_STORAGE_KEY) === "seen") return;
        } catch {
            // Fall back to the in-memory session flag when storage is blocked.
        }
        welcomeShownThisSession = true;
        setShowIntroduction(true);
        setOpen(true);
        try {
            window.localStorage.setItem(WELCOME_STORAGE_KEY, "seen");
        } catch {
            // The modal remains usable without persistent browser storage.
        }
    }, []);

    return (
        <AssistantModalPrimitive.Root open={open} onOpenChange={setOpen}>
            <AssistantModalPrimitive.Anchor className="aui-root aui-modal-anchor fixed end-8 bottom-8 size-11">
                <AssistantModalPrimitive.Trigger asChild>
                    <AssistantModalButton />
                </AssistantModalPrimitive.Trigger>
            </AssistantModalPrimitive.Anchor>
            <AssistantModalPrimitive.Content
                sideOffset={16}
                className="aui-root aui-modal-content z-50 flex h-[min(31.25rem,calc(100dvh-6rem))] w-[min(25rem,calc(100vw-2rem))] flex-col overflow-clip overscroll-contain rounded-xl border bg-popover p-0 text-popover-foreground shadow-md outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-1/2 data-[state=closed]:slide-out-to-right-1/2 data-[state=closed]:zoom-out data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-1/2 data-[state=open]:slide-in-from-right-1/2 data-[state=open]:zoom-in [&>.aui-thread-root]:bg-inherit [&>.aui-thread-root_.aui-thread-viewport-footer]:bg-inherit"
            >
                <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
                    <span className="text-sm font-semibold">Kompas AI</span>
                    <TooltipIconButton tooltip="Open chatpagina" asChild>
                        <Link to="/assistent" search={true}>
                            <Maximize2Icon className="size-4" />
                        </Link>
                    </TooltipIconButton>
                </div>
                <Thread components={showIntroduction ? introductionComponents : undefined} />
            </AssistantModalPrimitive.Content>
        </AssistantModalPrimitive.Root>
    );
};

type AssistantModalButtonProps = { "data-state"?: "open" | "closed" };

const AssistantModalButton = forwardRef<HTMLButtonElement, AssistantModalButtonProps>(({ "data-state": state, ...rest }, ref) => {
    const tooltip = state === "open" ? "Kompas AI sluiten" : "Kompas AI openen";

    return (
        <TooltipIconButton
            variant="default"
            tooltip={tooltip}
            side="left"
            {...rest}
            className="aui-modal-button size-full rounded-full bg-brand-500 p-7 shadow transition-transform hover:scale-110 hover:bg-brand-600 active:scale-90"
            ref={ref}
        >
            <CompassIcon
                data-state={state}
                className="aui-modal-button-closed-icon absolute size-7 text-white transition-all data-[state=closed]:scale-100 data-[state=closed]:rotate-0 data-[state=open]:scale-0 data-[state=open]:rotate-90"
            />

            <ChevronDownIcon
                data-state={state}
                className="aui-modal-button-open-icon absolute size-7 text-white transition-all data-[state=closed]:scale-0 data-[state=closed]:-rotate-90 data-[state=open]:scale-100 data-[state=open]:rotate-0"
            />
            <span className="aui-sr-only sr-only">{tooltip}</span>
        </TooltipIconButton>
    );
});

AssistantModalButton.displayName = "AssistantModalButton";
