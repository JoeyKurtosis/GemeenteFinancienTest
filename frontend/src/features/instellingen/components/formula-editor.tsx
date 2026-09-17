import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Check, Edit03, X } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { updateMeasure } from "../api";
import type { FieldInfo, Measure } from "../types";
import { FieldPalette } from "./field-palette";
import { anderePaginas } from "./measure-groups";
import { showToast } from "./show-toast";

/** Losse woorden in een formule; alles wat geen veldnaam is, is een fout. */
const IDENTIFIERS = /[A-Za-z_][A-Za-z0-9_]*/g;

/** Na deze tekens hoeft er geen spatie voor een ingevoegde veldnaam. */
const GEEN_SPATIE_NA = /[\s(+\-*/]$/;

interface FormulaEditorProps {
    measure: Measure;
    /** De paginagroep waarin deze kaart staat; bepaalt welke andere pagina's genoemd worden. */
    currentPage: string;
    fields: FieldInfo[];
    onUpdated: () => void;
}

export function FormulaEditor({ measure, currentPage, fields, onUpdated }: FormulaEditorProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [expression, setExpression] = useState(measure.expression);
    const [description, setDescription] = useState(measure.description);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const expressionRef = useRef<HTMLInputElement>(null);
    // Waar de cursor heen moet ná de re-render die op een invoeging volgt.
    const caretRef = useRef<number | null>(null);

    const fieldNames = useMemo(() => new Set(fields.map((field) => field.name)), [fields]);

    /**
     * Voorcontrole op veldnamen, puur om de fout te tonen vóór de request. De parser blijft aan
     * de serverkant: expression_eval.validate_expression is en blijft het oordeel, en zijn
     * melding komt hieronder in het foutvak terecht.
     */
    const onbekendeVelden = useMemo(() => {
        const gevonden = expression.match(IDENTIFIERS) ?? [];
        return [...new Set(gevonden.filter((naam) => !fieldNames.has(naam)))];
    }, [expression, fieldNames]);

    const isLeeg = !expression.trim();
    const kanOpslaan = !isLeeg && onbekendeVelden.length === 0;

    useEffect(() => {
        if (caretRef.current === null) return;
        const positie = caretRef.current;
        caretRef.current = null;
        const veld = expressionRef.current;
        if (!veld) return;
        veld.focus();
        veld.setSelectionRange(positie, positie);
    }, [expression]);

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

    /** Plakt een veldnaam op de cursorpositie, niet achteraan — anders is de palet-knop nutteloos. */
    function insertField(naam: string) {
        const veld = expressionRef.current;
        if (!veld) {
            setExpression((huidig) => (huidig ? `${huidig} ${naam}` : naam));
            return;
        }

        const start = veld.selectionStart ?? expression.length;
        const einde = veld.selectionEnd ?? start;
        const ervoor = expression.slice(0, start);
        const erna = expression.slice(einde);
        const tekst = (ervoor && !GEEN_SPATIE_NA.test(ervoor) ? " " : "") + naam;

        caretRef.current = start + tekst.length;
        setExpression(ervoor + tekst + erna);
    }

    async function save() {
        if (!kanOpslaan) return;
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

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === "Enter") {
            event.preventDefault();
            save();
        } else if (event.key === "Escape") {
            event.preventDefault();
            cancel();
        }
    }

    const overigePaginas = anderePaginas(measure, currentPage);

    return (
        <div className="rounded-xl border border-secondary bg-primary p-4 transition duration-100 ease-linear">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-primary">{measure.name}</h3>
                        <span className="font-mono text-xs text-quaternary">{measure.key}</span>
                    </div>

                    {/* De reikwijdte van een wijziging, niet alleen waar je nu staat: wie hier
                        `personeel` aanpast verandert ook de Benchmark-pagina. */}
                    {overigePaginas.length > 0 && <p className="mt-0.5 text-xs text-quaternary">Wordt ook gebruikt op {overigePaginas.join(", ")}</p>}
                </div>

                {!isEditing && (
                    <Button size="xs" color="tertiary" iconLeading={Edit03} onClick={startEditing}>
                        Bewerken
                    </Button>
                )}
            </div>

            {isEditing ? (
                <div className="mt-3 flex flex-col gap-3" onKeyDown={handleKeyDown}>
                    <div className="flex flex-col gap-2">
                        <Input
                            ref={expressionRef}
                            size="sm"
                            label="Formule"
                            value={expression}
                            onChange={setExpression}
                            placeholder="bijv. salarissen + inhuur"
                            spellCheck="false"
                            autoFocus
                            inputClassName="font-mono"
                            isInvalid={isLeeg || onbekendeVelden.length > 0}
                            hint={
                                isLeeg
                                    ? "De formule mag niet leeg zijn."
                                    : onbekendeVelden.length > 0
                                      ? `Onbekend veld: ${onbekendeVelden.join(", ")}`
                                      : "Klik een veld hieronder om het op de cursor in te voegen."
                            }
                        />
                        <FieldPalette fields={fields} onInsert={insertField} />
                    </div>

                    <Input size="sm" label="Beschrijving" value={description} onChange={setDescription} placeholder="Beschrijving van de formule" />

                    {error && (
                        <div className="rounded-lg border border-error bg-error-primary p-2">
                            <p className="text-sm text-error-primary">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button size="xs" color="primary" iconLeading={Check} isLoading={isSubmitting} isDisabled={!kanOpslaan} onClick={save}>
                            Opslaan
                        </Button>
                        <Button size="xs" color="secondary" iconLeading={X} isDisabled={isSubmitting} onClick={cancel}>
                            Annuleren
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="mt-2">
                    {/* text-brand-primary, not -secondary: on the bg-tertiary chip the lighter
                        brand-700 lands at 4.49:1, a hair under the WCAG AA 4.5:1 floor. */}
                    <code className="rounded bg-tertiary px-2 py-1 font-mono text-sm text-brand-primary">{measure.expression}</code>
                    {measure.description && <p className="mt-1 text-xs text-tertiary">{measure.description}</p>}
                </div>
            )}
        </div>
    );
}
