import { useState } from "react";
import { Check, Edit03, X } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { updateMeasure } from "../api";
import type { Measure } from "../types";
import { showToast } from "./show-toast";

interface FormulaEditorProps {
    measure: Measure;
    onUpdated: () => void;
}

export function FormulaEditor({ measure, onUpdated }: FormulaEditorProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [expression, setExpression] = useState(measure.expression);
    const [description, setDescription] = useState(measure.description);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function startEditing() {
        setExpression(measure.expression);
        setDescription(measure.description);
        setError(null);
        setIsEditing(true);
    }

    function cancel() {
        setExpression(measure.expression);
        setDescription(measure.description);
        setError(null);
        setIsEditing(false);
    }

    async function save() {
        setIsSubmitting(true);
        setError(null);
        try {
            await updateMeasure(measure.key, { expression, description });
            onUpdated();
            setIsEditing(false);
            showToast("success", "Opgeslagen", `Formule "${measure.name}" is bijgewerkt.`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Opslaan mislukt");
        } finally {
            setIsSubmitting(false);
        }
    }

    const pages = measure.page
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);

    return (
        <div className="rounded-xl border border-secondary bg-primary p-4 transition">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-primary">{measure.name}</h3>
                        <span className="text-xs text-quaternary">{measure.key}</span>
                    </div>

                    {pages.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                            {pages.map((page) => (
                                <Badge key={page} size="sm" color="brand" type="pill-color">
                                    {page}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                {!isEditing && (
                    <Button size="xs" color="tertiary" iconLeading={Edit03} onClick={startEditing}>
                        Bewerken
                    </Button>
                )}
            </div>

            {isEditing ? (
                <div className="mt-3 flex flex-col gap-3">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-secondary">Formule</label>
                        <input
                            type="text"
                            value={expression}
                            onChange={(e) => setExpression(e.target.value)}
                            className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 font-mono text-sm text-primary transition outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                            placeholder="bijv. salarissen + inhuur"
                            spellCheck={false}
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-secondary">Beschrijving</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary transition outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                            placeholder="Beschrijving van de formule"
                        />
                    </div>

                    {error && (
                        <div className="rounded-lg border border-error bg-error-primary p-2">
                            <p className="text-sm text-error-primary">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button size="xs" color="primary" iconLeading={Check} isLoading={isSubmitting} onClick={save}>
                            Opslaan
                        </Button>
                        <Button size="xs" color="secondary" iconLeading={X} isDisabled={isSubmitting} onClick={cancel}>
                            Annuleren
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="mt-2">
                    <code className="rounded bg-tertiary px-2 py-1 font-mono text-sm text-brand-secondary">{measure.expression}</code>
                    {measure.description && <p className="mt-1 text-xs text-tertiary">{measure.description}</p>}
                </div>
            )}
        </div>
    );
}
