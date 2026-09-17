import { useAuiState } from "@assistant-ui/react";
import { AlertCircleIcon, CheckCircle2Icon, InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAssistantFeatures } from "./assistant-provider";
import { isAnswerEngineEnvelope, type AnswerEngineEnvelope } from "../types";

const formatCell = (value: unknown) => {
    if (value == null) return "—";
    if (typeof value === "number") return new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 2 }).format(value);
    if (typeof value === "boolean") return value ? "Ja" : "Nee";
    return String(value);
};

const typeLabel: Record<AnswerEngineEnvelope["type"], string> = {
    answer: "Beantwoord",
    refusal: "Niet beantwoord",
    conversation: "Toelichting",
    unavailable: "Tijdelijk niet beschikbaar",
};

export function AnswerEngineDetails() {
    const raw = useAuiState((state) => state.message.role === "assistant" ? state.message.metadata.custom.answerEngine : null);
    const { sendQuestion } = useAssistantFeatures();
    if (!isAnswerEngineEnvelope(raw)) return null;

    const suggestions = raw.type === "refusal"
        ? [...raw.refusal?.instead ?? [], ...raw.suggestions]
        : raw.suggestions;
    const uniqueSuggestions = suggestions.filter(
        (suggestion, index) => suggestions.findIndex((candidate) => candidate.question === suggestion.question) === index,
    );

    return (
        <div className="mt-3 space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span
                    className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
                        raw.type === "unavailable" && "border-destructive/30 text-destructive",
                    )}
                >
                    {raw.type === "answer" ? <CheckCircle2Icon className="size-3" /> : raw.type === "unavailable" ? <AlertCircleIcon className="size-3" /> : <InfoIcon className="size-3" />}
                    {typeLabel[raw.type]}
                </span>
                {raw.data_as_of && <span>Data bijgewerkt t/m {new Intl.DateTimeFormat("nl-NL").format(new Date(raw.data_as_of))}</span>}
                {raw.confidence && <span title={raw.confidence.factors.join("; ")}>Zekerheid: {raw.confidence.band === "confident" ? "hoog" : raw.confidence.band === "caveated" ? "met kanttekeningen" : "geweigerd"}</span>}
            </div>

            {raw.context_labels.length > 0 && (
                <div className="flex flex-wrap gap-1.5" aria-label="Gebruikte context">
                    {raw.context_labels.map((item) => (
                        <span key={item.key} className="rounded-md bg-muted px-2 py-1 text-xs" title={item.chosen_by_engine ? "Door de assistent gekozen" : undefined}>
                            {item.label ?? item.value}
                        </span>
                    ))}
                </div>
            )}

            {raw.type === "unavailable" && raw.unavailable?.retry_after_seconds != null && (
                <p className="rounded-md bg-destructive/10 p-2 text-destructive">
                    Probeer het over ongeveer {raw.unavailable.retry_after_seconds} seconden opnieuw.
                </p>
            )}

            {raw.type === "refusal" && raw.refusal?.would_need && (
                <p className="rounded-md bg-muted p-2"><span className="font-medium">Wat hiervoor nodig is:</span> {raw.refusal.would_need}</p>
            )}

            {raw.result && raw.result.columns.length > 0 && (
                <details className="rounded-lg border">
                    <summary className="cursor-pointer px-3 py-2 font-medium">Onderliggende gegevens</summary>
                    <div className="overflow-x-auto border-t">
                        <table className="w-full min-w-max text-left text-xs">
                            <thead className="bg-muted/60">
                                <tr>
                                    {raw.result.columns.map((column) => (
                                        <th key={column.name} scope="col" className="px-3 py-2 font-medium">
                                            {column.label ?? column.name}{column.unit ? ` (${column.unit})` : ""}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {raw.result.rows.length === 0 ? (
                                    <tr><td colSpan={raw.result.columns.length} className="px-3 py-3 text-muted-foreground">Geen gegevens gevonden.</td></tr>
                                ) : raw.result.rows.map((row, rowIndex) => (
                                    <tr key={rowIndex} className="border-t">
                                        {raw.result!.columns.map((column, columnIndex) => (
                                            <td key={column.name} className="px-3 py-2">{formatCell(row[columnIndex])}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </details>
            )}

            {uniqueSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-2" aria-label="Vervolgvragen">
                    {uniqueSuggestions.map((suggestion) => (
                        <Button
                            key={suggestion.question}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-auto whitespace-normal py-1.5 text-left"
                            disabled={!suggestion.token}
                            title={!suggestion.token ? "Deze suggestie kan niet veilig worden uitgevoerd." : undefined}
                            onClick={() => suggestion.token && sendQuestion(suggestion.question, suggestion.token)}
                        >
                            {suggestion.question}
                        </Button>
                    ))}
                </div>
            )}

            <p className="border-t pt-2 text-xs text-muted-foreground">{raw.disclosure}</p>
        </div>
    );
}
