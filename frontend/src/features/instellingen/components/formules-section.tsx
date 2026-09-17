import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ChevronDown, RefreshCcw01, SearchLg } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { cx } from "@/utils/cx";
import { fetchMeasures, resetMeasures } from "../api";
import type { FieldInfo, Measure } from "../types";
import { ConfirmModal } from "./confirm-modal";
import { FormulaEditor } from "./formula-editor";
import { groupMeasuresByPage } from "./measure-groups";
import { showToast } from "./show-toast";

export function FormulesSection() {
    const [measures, setMeasures] = useState<Measure[]>([]);
    const [fields, setFields] = useState<FieldInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
    const [resetOpen, setResetOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const queryClient = useQueryClient();

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

    /**
     * Na een formulewijziging klopt élk getal op het dashboard niet meer.
     *
     * De QueryClient in main.tsx staat op `staleTime: Infinity` — terecht, want de IV3-cijfers
     * worden ongeveer eens per jaar door CBS herzien, dus binnen een sessie verandert er niets.
     * Deze pagina is de uitzondering: hier verandert de *berekening* wel, en zonder deze
     * invalidatie kreeg je bij het teruglopen naar /trends de payload van vóór de wijziging
     * geserveerd. Alleen een harde herlading hielp, en dat leest als "er gebeurt niets".
     *
     * Ongefilterd, want een formule kan op meerdere pagina's meetellen en de sleutels van de
     * grafiekpagina's (`[feature, params]`, zie use-chart-query.ts) zouden hier als losse lijst
     * verouderen. Er staat op deze pagina geen enkele grafiekquery actief, dus dit markeert ze
     * alleen als verlopen; ze worden pas opgehaald zodra je de pagina echt opent.
     */
    const refreshDashboardData = useCallback(async () => {
        await loadMeasures();
        await queryClient.invalidateQueries();
    }, [loadMeasures, queryClient]);

    const groups = useMemo(() => groupMeasuresByPage(measures, query), [measures, query]);

    // Bij het eerste laden staat alleen de bovenste groep open, zodat de pagina te overzien is.
    useEffect(() => {
        if (!measures.length) return;
        setOpenGroups((huidig) => {
            if (huidig.size) return huidig;
            const eerste = groupMeasuresByPage(measures)[0];
            return eerste ? new Set([eerste.page]) : huidig;
        });
    }, [measures]);

    const isZoeken = query.trim().length > 0;

    function toggleGroup(page: string) {
        setOpenGroups((huidig) => {
            const volgende = new Set(huidig);
            if (!volgende.delete(page)) volgende.add(page);
            return volgende;
        });
    }

    async function handleReset() {
        setIsResetting(true);
        try {
            await resetMeasures();
            await refreshDashboardData();
            setResetOpen(false);
            showToast("success", "Hersteld", "De standaardformules staan weer op hun oorspronkelijke waarde.");
        } catch {
            showToast("error", "Fout", "Herstellen mislukt.");
        } finally {
            setIsResetting(false);
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
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-2xl">
                    <h2 className="text-lg font-semibold text-primary">Berekeningsformules</h2>
                    <p className="text-sm text-tertiary">
                        Deze formules bepalen hoe elk getal op het dashboard uit de IV3-data wordt berekend. Een wijziging is direct zichtbaar in alle grafieken
                        op de gekoppelde pagina. Formules gebruiken veldnamen en rekenkundige operatoren (+, -, *, /).
                    </p>
                </div>
                <Button size="sm" color="secondary" iconLeading={RefreshCcw01} onClick={() => setResetOpen(true)}>
                    Standaardwaarden herstellen
                </Button>
            </div>

            <Input
                size="sm"
                icon={SearchLg}
                value={query}
                onChange={setQuery}
                placeholder="Zoek op naam, veld of formule..."
                aria-label="Formules zoeken"
                className="max-w-sm"
            />

            {groups.length === 0 ? (
                <EmptyState size="sm" className="py-12">
                    <EmptyState.Header>
                        <EmptyState.FeaturedIcon color="gray" icon={SearchLg} />
                    </EmptyState.Header>
                    <EmptyState.Content>
                        <EmptyState.Title>Geen formules gevonden</EmptyState.Title>
                        <EmptyState.Description>
                            Geen enkele formule komt overeen met "{query}". Probeer een veldnaam of een deel van een titel.
                        </EmptyState.Description>
                    </EmptyState.Content>
                    <EmptyState.Footer>
                        <Button size="sm" color="secondary" onClick={() => setQuery("")}>
                            Zoekopdracht wissen
                        </Button>
                    </EmptyState.Footer>
                </EmptyState>
            ) : (
                <div className="flex flex-col gap-3">
                    {groups.map((group) => {
                        // Tijdens het zoeken staat alles open: anders verstopt een treffer zich
                        // in een dichtgeklapte groep en lijkt de zoekopdracht niets te vinden.
                        const isOpen = isZoeken || openGroups.has(group.page);

                        return (
                            <section key={group.page} className="overflow-hidden rounded-xl border border-secondary">
                                <div className="flex items-center justify-between gap-3 bg-secondary pr-4">
                                    <button
                                        type="button"
                                        onClick={() => toggleGroup(group.page)}
                                        aria-expanded={isOpen}
                                        className="flex flex-1 cursor-pointer items-center gap-2 px-4 py-3 text-left transition duration-100 ease-linear hover:bg-secondary_hover"
                                    >
                                        <ChevronDown
                                            aria-hidden="true"
                                            className={cx("size-4 shrink-0 text-fg-quaternary transition duration-100 ease-linear", !isOpen && "-rotate-90")}
                                        />
                                        <span className="text-md font-semibold text-primary">{group.page}</span>
                                        <Badge size="sm" color="gray" type="modern">
                                            {group.measures.length} {group.measures.length === 1 ? "formule" : "formules"}
                                        </Badge>
                                    </button>

                                    {group.route && (
                                        <Button href={group.route} size="sm" color="link-color" iconTrailing={ArrowRight}>
                                            Bekijk pagina
                                        </Button>
                                    )}
                                </div>

                                {isOpen && (
                                    <div className="flex flex-col gap-3 border-t border-secondary bg-primary p-4">
                                        {group.measures.map((measure) => (
                                            <FormulaEditor
                                                key={measure.key}
                                                measure={measure}
                                                currentPage={group.page}
                                                fields={fields}
                                                onUpdated={refreshDashboardData}
                                            />
                                        ))}
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </div>
            )}

            <ConfirmModal
                isOpen={resetOpen}
                onOpenChange={setResetOpen}
                icon={RefreshCcw01}
                title="Standaardwaarden herstellen?"
                description="Alle standaardformules gaan terug naar hun oorspronkelijke waarde. Zelf toegevoegde formules blijven ongewijzigd."
                confirmLabel="Herstellen"
                isConfirming={isResetting}
                onConfirm={handleReset}
            />
        </div>
    );
}
