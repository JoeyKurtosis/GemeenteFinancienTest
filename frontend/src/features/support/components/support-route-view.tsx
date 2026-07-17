import React, { useEffect, useState } from "react";
import { Navigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Paperclip, X } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FileTrigger } from "@/components/base/file-upload-trigger/file-upload-trigger";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { IconNotification } from "@/components/application/notifications/notifications";
import { useAuth } from "@/features/auth";
import { createSupportRequest } from "../api";

export function SupportRouteView() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: "",
    });
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData((prev) => ({
                ...prev,
                name: `${user.first_name} ${user.last_name}`.trim() || "",
                email: user.email || "",
            }));
        }
    }, [user]);

    function handleFilesSelected(files: FileList | null) {
        if (files) {
            setAttachments((prev) => [...prev, ...Array.from(files)]);
        }
    }

    function handleRemoveFile(index: number) {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const result = await createSupportRequest({ ...formData, attachments });
            setFormData((prev) => ({ ...prev, subject: "", message: "" }));
            setAttachments([]);
            toast.custom((id) => (
                <IconNotification
                    title="Bericht verzonden"
                    description={`Uw bericht is succesvol verzonden. Ticketnummer: ${result.ticket_number}`}
                    color="success"
                    hideDismissLabel
                    onClose={() => toast.dismiss(id)}
                />
            ));
        } catch (error) {
            toast.custom((id) => (
                <IconNotification
                    title="Fout bij verzenden"
                    description={error instanceof Error ? error.message : "Er is iets misgegaan. Probeer het opnieuw."}
                    color="error"
                    hideDismissLabel
                    onClose={() => toast.dismiss(id)}
                />
            ));
        } finally {
            setIsSubmitting(false);
        }
    }

    if (!isLoading && !isAuthenticated) {
        return <Navigate to="/login" />;
    }

    return (
        <section className="flex items-center justify-between gap-16">
            <div className="w-full max-w-xl">
                <p className="mb-8 text-tertiary">Hulp nodig of een vraag? Laat het ons weten via het formulier.</p>

                <form className="space-y-5" onSubmit={handleSubmit}>
                    <Input
                        label="Naam"
                        placeholder="Naam"
                        isRequired
                        value={formData.name}
                        onChange={(value) => setFormData((prev) => ({ ...prev, name: value }))}
                    />
                    <Input
                        label="E-mail"
                        type="email"
                        placeholder="voorbeeld@gmail.com"
                        isRequired
                        value={formData.email}
                        onChange={(value) => setFormData((prev) => ({ ...prev, email: value }))}
                    />
                    <Input
                        label="Onderwerp"
                        placeholder="Onderwerp"
                        isRequired
                        value={formData.subject}
                        onChange={(value) => setFormData((prev) => ({ ...prev, subject: value }))}
                    />
                    <TextArea
                        label="Bericht"
                        placeholder="Schrijf hier uw bericht..."
                        isRequired
                        value={formData.message}
                        onChange={(value) => setFormData((prev) => ({ ...prev, message: value }))}
                        rows={6}
                    />

                    <div className="space-y-2">
                        <p className="text-sm font-medium text-secondary">Bijlagen</p>
                        <FileTrigger allowsMultiple onSelect={handleFilesSelected}>
                            <Button type="button" color="secondary" size="sm" iconLeading={Paperclip} className="w-full">
                                Bestanden toevoegen
                            </Button>
                        </FileTrigger>
                        {attachments.length > 0 && (
                            <ul className="mt-2 space-y-1.5">
                                {attachments.map((file, index) => (
                                    <li key={`${file.name}-${index}`} className="flex items-center gap-2 text-sm text-tertiary">
                                        <Paperclip className="size-4 shrink-0 text-fg-quaternary" />
                                        <span className="truncate">{file.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveFile(index)}
                                            className="ml-auto shrink-0 text-fg-quaternary transition duration-100 ease-linear hover:text-fg-error-secondary"
                                        >
                                            <X className="size-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <Button type="submit" size="md" isLoading={isSubmitting} showTextWhileLoading className="w-full">
                        {isSubmitting ? "Versturen..." : "Verstuur bericht"}
                    </Button>
                </form>
            </div>
            <img src="/denhaag.jpg" alt="Support" className="max-h-125 w-1/2 shrink-0 rounded-xl object-cover object-center max-lg:hidden" />
        </section>
    );
}
