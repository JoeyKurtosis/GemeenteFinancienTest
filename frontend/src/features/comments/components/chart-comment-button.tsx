import { useRef, useState } from "react";
import { MessageChatSquare } from "@untitledui/icons";
import { Button as AriaButton, Dialog as AriaDialog, DialogTrigger as AriaDialogTrigger, Popover as AriaPopover } from "react-aria-components";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import type { ChartComment } from "../api";
import { deleteComment, saveComment } from "../api";

interface ChartCommentButtonProps {
    chartId: string;
    comment?: ChartComment;
    onSaved: () => void;
}

export function ChartCommentButton({ chartId, comment, onSaved }: ChartCommentButtonProps) {
    const [text, setText] = useState(comment?.text ?? "");
    const [isSaving, setIsSaving] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const hasComment = !!comment;

    function handleOpen(isOpen: boolean) {
        if (isOpen) {
            setText(comment?.text ?? "");
        }
    }

    async function handleSave(close: () => void) {
        const trimmed = text.trim();
        if (!trimmed) return;
        setIsSaving(true);
        try {
            await saveComment(chartId, trimmed);
            onSaved();
            close();
        } catch {
            // silent fail — the user sees the popover stays open
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete(close: () => void) {
        setIsSaving(true);
        try {
            await deleteComment(chartId);
            setText("");
            onSaved();
            close();
        } catch {
            // silent fail
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <AriaDialogTrigger onOpenChange={handleOpen}>
            <AriaButton
                ref={triggerRef}
                className={cx(
                    "rounded-md p-1.5 transition duration-100 ease-linear hover:bg-secondary_hover",
                    hasComment ? "text-brand-secondary hover:text-brand-secondary" : "text-fg-quaternary hover:text-fg-quaternary_hover",
                )}
                aria-label="Notitie"
            >
                <MessageChatSquare className="size-5" aria-hidden="true" />
            </AriaButton>
            <AriaPopover
                triggerRef={triggerRef}
                placement="bottom end"
                className="w-80 rounded-xl bg-primary shadow-lg ring-1 ring-secondary ring-inset"
            >
                <AriaDialog className="flex flex-col gap-3 p-4 outline-hidden">
                    {({ close }) => (
                        <>
                            <label className="text-sm font-semibold text-primary">Notitie</label>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Voeg een notitie toe..."
                                rows={3}
                                className="w-full resize-none rounded-lg border border-primary bg-primary px-3 py-2 text-sm text-primary placeholder:text-placeholder focus:border-brand focus:ring-1 focus:ring-brand focus:outline-hidden"
                            />
                            <div className="flex items-center justify-between">
                                <div>
                                    {hasComment && (
                                        <Button size="sm" color="tertiary-destructive" isDisabled={isSaving} onPress={() => handleDelete(close)}>
                                            Verwijderen
                                        </Button>
                                    )}
                                </div>
                                <Button size="sm" color="primary" isDisabled={isSaving || !text.trim()} onPress={() => handleSave(close)}>
                                    Opslaan
                                </Button>
                            </div>
                        </>
                    )}
                </AriaDialog>
            </AriaPopover>
        </AriaDialogTrigger>
    );
}
