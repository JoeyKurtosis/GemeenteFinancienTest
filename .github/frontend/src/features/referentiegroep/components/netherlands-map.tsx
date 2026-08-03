import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InfoCircle, RefreshCw01, ZoomIn, ZoomOut } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { useFilters } from "@/features/filters";
import { resolveGemeenteCode } from "../data/gemeente-mergers";
import { GEMEENTE_SHAPES, MAP_HEIGHT, MAP_VIEWBOX, MAP_WIDTH, SHAPE_JAAR } from "../data/gemeente-shapes";
import {
    BUITEN_FILTER,
    BUITEN_FILTER_GESELECTEERD,
    PROVINCIE_BASIS,
    PROVINCIE_GESELECTEERD,
    ZONDER_GEMEENTE,
    ZONDER_PROVINCIE,
    ZONDER_PROVINCIE_GESELECTEERD,
} from "../data/provincie-colors";
import { useMapView } from "../hooks/use-map-view";
import type { ReferentiegroepSamenstelling } from "../hooks/use-referentiegroep-samenstelling";

/**
 * Click a gemeente to put it in the referentiegroep, or take it out again.
 *
 * The outlines are the 2021 indeling folded onto the selected year (see gemeente-mergers.ts),
 * coloured by province, and dimmed where the page filters rule a gemeente out. Clicks go into
 * the page's own selection, which is handed to the dashboard only on Toepassen — so neither
 * the sidebar nor the charts move while the user is still composing.
 *
 * Deliberately `aria-hidden`: 352 tab stops would be a hazard rather than access, and the map
 * is redundant — the Referentiegroep list beside it does the same job, searchable and fully
 * keyboard-operable. The live region below reports what a click did, so the map is not silent
 * to a screen reader that is following along.
 */

/** stroke-width in user units. `non-scaling-stroke` keeps it constant however far you zoom. */
const STREEK = 0.5;

interface NetherlandsMapProps {
    samenstelling: ReferentiegroepSamenstelling;
}

export default function NetherlandsMap({ samenstelling }: NetherlandsMapProps) {
    const { options, isLoading } = useFilters();
    const { zichtbaar, provincies, selectie, onSelectieChange } = samenstelling;

    const wrapperRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [zweeftOver, setZweeftOver] = useState<string | null>(null);

    const { transform, kanInzoomen, kanUitzoomen, zoomIn, zoomUit, reset, zoomNaarVak, wasSleep, pointerHandlers, view } = useMapView(wrapperRef);

    const gemeentePerCode = useMemo(() => new Map(options.gemeenten.map((gemeente) => [gemeente.id, gemeente])), [options.gemeenten]);

    const geselecteerd = useMemo(
        () => (selectie === "all" ? new Set(gemeentePerCode.keys()) : new Set([...selectie].map(String))),
        [selectie, gemeentePerCode],
    );

    /**
     * The 2021 outlines folded onto this year's gemeenten: everything that merged into the
     * same successor becomes one path, so each gemeente is a single shape with a single class
     * and hover, clicks and colouring all stay uniform. Recomputed per year, not per render.
     */
    const vormen = useMemo(() => {
        const bestaandeCodes = new Set(gemeentePerCode.keys());
        const perCode = new Map<string, string[]>();
        const zonderGemeente: string[] = [];

        for (const [gmCode, d] of GEMEENTE_SHAPES) {
            const code = resolveGemeenteCode(gmCode, bestaandeCodes);
            if (code === null) {
                zonderGemeente.push(d);
                continue;
            }
            const bestaand = perCode.get(code);
            if (bestaand) bestaand.push(d);
            else perCode.set(code, [d]);
        }

        return {
            // Concatenating is lossless: every subpath re-anchors with an absolute M.
            gemeenten: [...perCode].map(([code, delen]) => ({ code, d: delen.join(" ") })),
            zonderGemeente,
        };
    }, [gemeentePerCode]);

    /** Gemeenten this year has that the 2021 outlines cannot draw. Zero for 2021 and later. */
    const ontbrekend = useMemo(() => {
        const getekend = new Set(vormen.gemeenten.map((vorm) => vorm.code));
        return options.gemeenten.filter((gemeente) => !getekend.has(gemeente.id));
    }, [vormen, options.gemeenten]);

    /**
     * Frame the chosen provinces whenever that choice changes.
     *
     * Measured off the rendered paths rather than the raw path data: getBBox() reports a
     * path's own user-space box, unaffected by the transform on the <g> above it, so it is
     * already in the units the view maths works in — and it costs nothing to be exact.
     *
     * With every province chosen (the default) the box is the whole country, the scale clamps
     * to 1, and this settles on the same view as Reset. So it needs no special case, and the
     * run on mount is a no-op rather than something that fights a shared URL.
     */
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg || isLoading) return;

        const gekozenProvincies = provincies === "all" ? null : new Set([...provincies].map(String));
        if (gekozenProvincies === null) {
            zoomNaarVak(null);
            return;
        }

        const codes = options.gemeenten
            .filter((gemeente) => gemeente.provincie && gekozenProvincies.has(gemeente.provincie))
            .map((gemeente) => gemeente.id);

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const code of codes) {
            const path = svg.querySelector<SVGPathElement>(`[data-gm="${code}"]`);
            if (!path) continue;
            const vak = path.getBBox();
            minX = Math.min(minX, vak.x);
            minY = Math.min(minY, vak.y);
            maxX = Math.max(maxX, vak.x + vak.width);
            maxY = Math.max(maxY, vak.y + vak.height);
        }

        zoomNaarVak(minX === Infinity ? null : { x: minX, y: minY, width: maxX - minX, height: maxY - minY });
    }, [provincies, options.gemeenten, isLoading, zoomNaarVak]);

    /**
     * A plain click picks one gemeente; shift-click builds the group up from there.
     *
     * Plain click *replaces* rather than toggles, which is what makes the map usable at all:
     * the page opens on "alle", so a toggling click would start by removing one gemeente from
     * all 342 — the opposite of what clicking a gemeente looks like it should do. Replacing
     * means the first click always lands you somewhere legible, whatever came before it.
     */
    const onClick = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            // The click that ends a drag is not a selection.
            if (wasSleep()) return;
            const code = (event.target as SVGElement | HTMLElement).dataset?.gm;
            if (!code) return;

            if (!event.shiftKey) {
                onSelectieChange(new Set([code]));
                return;
            }

            const volgende = new Set(geselecteerd);
            if (volgende.has(code)) volgende.delete(code);
            else volgende.add(code);
            onSelectieChange(volgende);
        },
        [geselecteerd, onSelectieChange, wasSleep],
    );

    const onPointerMove = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            pointerHandlers.onPointerMove(event);

            const code = (event.target as SVGElement | HTMLElement).dataset?.gm ?? null;
            setZweeftOver((huidig) => (huidig === code ? huidig : code));

            // Position is written straight to the node: following the cursor through state would
            // re-render the map on every pointer event.
            const tooltip = tooltipRef.current;
            if (tooltip && code) {
                const rect = event.currentTarget.getBoundingClientRect();
                tooltip.style.transform = `translate(${event.clientX - rect.left}px, ${event.clientY - rect.top}px)`;
            }
        },
        [pointerHandlers],
    );

    /**
     * The paths, memoised away from the view transform. On a zoom or pan frame this array is
     * referentially identical, so React bails out without touching all 352 children — which is
     * the difference between a smooth pan and a stuttering one.
     */
    const paden = useMemo(
        () =>
            vormen.gemeenten.map(({ code, d }) => {
                const gemeente = gemeentePerCode.get(code);
                const isGeselecteerd = geselecteerd.has(code);
                const isZichtbaar = zichtbaar.has(code);
                const provincie = gemeente?.provincie;

                let className: string;
                if (!isZichtbaar) {
                    className = isGeselecteerd ? BUITEN_FILTER_GESELECTEERD : BUITEN_FILTER;
                } else if (provincie && PROVINCIE_BASIS[provincie]) {
                    className = isGeselecteerd ? PROVINCIE_GESELECTEERD[provincie] : PROVINCIE_BASIS[provincie];
                } else {
                    className = isGeselecteerd ? ZONDER_PROVINCIE_GESELECTEERD : ZONDER_PROVINCIE;
                }

                return (
                    <path
                        key={code}
                        data-gm={code}
                        d={d}
                        className={`cursor-pointer transition-[fill] duration-100 ease-linear ${className}`}
                        strokeWidth={isGeselecteerd ? STREEK * 2 : STREEK}
                    />
                );
            }),
        [vormen, gemeentePerCode, geselecteerd, zichtbaar],
    );

    const zwevendeGemeente = zweeftOver ? gemeentePerCode.get(zweeftOver) : undefined;
    const zweeftOverGekozen = zweeftOver !== null && geselecteerd.has(zweeftOver);

    return (
        <div className="space-y-3">
            <div className="relative">
                {/* Full width, with the height doing the sizing: the outlines are portrait, so
                    `xMidYMid meet` scales them to the height and centres the country in the
                    leftover width. A clamped height rather than a fixed aspect ratio, which at
                    this width would make the map ~1400px tall and push the page off screen. */}
                <div
                    ref={wrapperRef}
                    onClick={onClick}
                    {...pointerHandlers}
                    onPointerMove={onPointerMove}
                    onPointerLeave={() => setZweeftOver(null)}
                    className={`relative h-[clamp(420px,72vh,860px)] w-full touch-none overflow-hidden rounded-[12px] bg-secondary select-none ${
                        view.k > 1 ? "cursor-grab active:cursor-grabbing" : ""
                    }`}
                >
                    <svg ref={svgRef} viewBox={MAP_VIEWBOX} preserveAspectRatio="xMidYMid meet" className="size-full" aria-hidden="true" focusable="false">
                        {/* non-scaling-stroke pins the borders to screen space, so they stay hairlines
                            at 8x instead of turning into slabs. It is not inherited, hence the selector. */}
                        <g transform={transform} className="[&_path]:[vector-effect:non-scaling-stroke]">
                            {vormen.zonderGemeente.map((d, index) => (
                                <path key={`leeg-${index}`} d={d} className={ZONDER_GEMEENTE} strokeWidth={STREEK} />
                            ))}
                            {paden}
                        </g>
                    </svg>

                    {zwevendeGemeente && (
                        <div ref={tooltipRef} className="pointer-events-none absolute top-0 left-0 z-10">
                            <div className="translate-x-2 -translate-y-full rounded-lg bg-primary-solid px-2.5 py-1.5 shadow-lg">
                                <p className="text-xs font-semibold whitespace-nowrap text-white">{zwevendeGemeente.label}</p>
                                {zwevendeGemeente.inwoners != null && (
                                    <p className="text-xs whitespace-nowrap text-white/70">{zwevendeGemeente.inwoners.toLocaleString("nl-NL")} inwoners</p>
                                )}
                                {/* Shift-click is worth nothing if nobody knows it is there, and the
                                    tooltip is already open at the moment it becomes useful. */}
                                <p className="text-xs whitespace-nowrap text-white/50">
                                    {zweeftOverGekozen ? "Shift+klik om te verwijderen" : "Klik om te kiezen · shift+klik om toe te voegen"}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="absolute top-3 right-3 flex flex-col gap-1">
                    <Button color="secondary" size="sm" iconLeading={ZoomIn} aria-label="Inzoomen" isDisabled={!kanInzoomen || isLoading} onClick={zoomIn} />
                    <Button
                        color="secondary"
                        size="sm"
                        iconLeading={ZoomOut}
                        aria-label="Uitzoomen"
                        isDisabled={!kanUitzoomen || isLoading}
                        onClick={zoomUit}
                    />
                    <Button
                        color="secondary"
                        size="sm"
                        iconLeading={RefreshCw01}
                        aria-label="Kaart herstellen"
                        isDisabled={!kanUitzoomen || isLoading}
                        onClick={reset}
                    />
                </div>
            </div>

            {/* The map is aria-hidden, so this is what a screen reader hears a click do. */}
            <p aria-live="polite" className="sr-only">
                {geselecteerd.size} gemeenten geselecteerd
            </p>
            <p className="sr-only">
                De kaart toont de Referentiegroep-selectie hierboven. Klikken kiest één gemeente, shift+klik voegt er een toe. Gebruik de Referentiegroep-lijst
                om gemeenten met het toetsenbord te selecteren.
            </p>

            {ontbrekend.length > 0 && (
                <p className="flex items-start gap-2 text-xs text-tertiary">
                    <InfoCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <span>
                        De kaart toont de gemeentegrenzen van {SHAPE_JAAR}. Voor {options.jaar} {ontbrekend.length === 1 ? "ontbreekt" : "ontbreken"}{" "}
                        {ontbrekend.length} {ontbrekend.length === 1 ? "gemeente" : "gemeenten"}; gebruik de Referentiegroep-lijst om{" "}
                        {ontbrekend.length === 1 ? "die" : "ze"} te selecteren.
                    </span>
                </p>
            )}
        </div>
    );
}

/** Kept for the wrapper's aspect box while the chunk loads. */
export const MAP_ASPECT = `${MAP_WIDTH}/${MAP_HEIGHT}`;
