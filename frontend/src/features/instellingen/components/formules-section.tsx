import { useCallback, useEffect, useState } from "react";
import { RefreshCcw01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { fetchMeasures, resetMeasures } from "../api";
import type { FieldInfo, Measure } from "../types";
import { FormulaEditor } from "./formula-editor";
import { showToast } from "./show-toast";

export function FormulesSection() {
    const [measures, setMeasures] = useState<Measure[]>([]);
    const [fields, setFields] = useState<FieldInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadMeasures = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await fetchMeasures();
            setMeasures(data.measures);
            setFields(data.fields);
        } catch {
            showToast("error", "Fout", "Formules ophalen mislukt.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMeasures();
    }, [loadMeasures]);

    async function handleReset() {
        if (!confirm("Weet je zeker dat je alle formules wilt herstellen naar de standaardwaarden?")) {
            return;
        }
        try {
            await resetMeasures();
            await loadMeasures();
            showToast("success", "Hersteld", "Alle formules zijn teruggezet naar de standaardwaarden.");
        } catch {
            showToast("error", "Fout", "Herstellen mislukt.");
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <p className="text-sm text-tertiary">Formules laden...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-1">
                <div>
                    <h2 className="text-lg font-semibold text-primary">Berekeningsformules</h2>
                    <p className="text-sm text-tertiary">
                        Bewerk de formules die bepalen hoe elke metric wordt berekend uit de IV3-data. Formules gebruiken veldnamen en rekenkundige operatoren
                        (+, -, *, /).
                    </p>
                </div>
                <Button size="sm" color="secondary" iconLeading={RefreshCcw01} onClick={handleReset}>
                    Standaardwaarden herstellen
                </Button>
            </div>

            <hr className="border-secondary" />

            <div className="rounded-xl border border-secondary bg-secondary p-4">
                <h3 className="mb-2 text-sm font-semibold text-primary">Beschikbare velden</h3>
                <div className="grid gap-1 sm:grid-cols-2">
                    {fields.map((field) => (
                        <div key={field.name} className="flex items-baseline gap-2">
                            <code className="shrink-0 font-mono text-xs text-brand-secondary">{field.name}</code>
                            <span className="text-xs text-tertiary">{field.description}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-3">
                {measures.map((measure) => (
                    <FormulaEditor key={measure.key} measure={measure} onUpdated={loadMeasures} />
                ))}
            </div>
        </div>
    );
}
