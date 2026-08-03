import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { MAP_HEIGHT, MAP_WIDTH } from "../data/gemeente-shapes";

/**
 * Zoom and pan for the map, as a `translate(tx ty) scale(k)` transform over a fixed viewBox.
 *
 * A fixed viewBox plus a transform, rather than moving the viewBox itself: the clamp is then
 * expressible directly on (k, tx, ty), which is what you would have to recover from an
 * (x, y, w, h) viewBox anyway.
 *
 * The transform order matters. `translate` is applied *after* `scale`, so tx/ty are in
 * viewBox units and panning is one multiplication. `scale(k) translate(t)` would put t in
 * content units and need a /k in every branch.
 */

const MIN_K = 1;
const MAX_K = 8;
export const ZOOM_STAP = 1.5;
const WHEEL_GEVOELIGHEID = 0.002;
/** How far a pointer may travel before a click counts as a drag instead (CSS px). */
const SLEEP_DREMPEL = 4;
/** Firefox reports wheel deltas in lines rather than pixels. */
const REGELS_NAAR_PIXELS = 16;
/** How much of the frame a zoom-to-fit fills, leaving the province a margin to breathe in. */
const VULLING = 0.85;

export interface MapView {
    k: number;
    tx: number;
    ty: number;
}

const BEGINSTAND: MapView = { k: 1, tx: 0, ty: 0 };

const klem = (waarde: number, min: number, max: number) => Math.min(max, Math.max(min, waarde));

/**
 * Where the viewBox actually lands inside the element, under `preserveAspectRatio="xMidYMid
 * meet"`: scaled to whichever axis runs out first, and centred in the slack on the other.
 *
 * The container is deliberately not the viewBox's aspect ratio — it is full width and much
 * shorter — so the two axes have different amounts of letterbox, and screen pixels cannot be
 * turned into user units by `rect.width / MAP_WIDTH`. Everything that starts from a pointer
 * position has to come through here or it lands in the wrong place.
 */
const meetVerhouding = (rect: DOMRect) => {
    const schaal = Math.min(rect.width / MAP_WIDTH, rect.height / MAP_HEIGHT);
    return {
        schaal,
        offsetX: (rect.width - MAP_WIDTH * schaal) / 2,
        offsetY: (rect.height - MAP_HEIGHT * schaal) / 2,
    };
};

/**
 * Keep the content covering the viewport: the map can be zoomed into but never dragged off
 * its own edge. Content spans [tx, tx + k·W], which covers [0, W] exactly when
 * tx ∈ [-(k-1)·W, 0]. At k = 1 that collapses to tx = 0, so reset needs no special case.
 */
const klemView = ({ k, tx, ty }: MapView): MapView => {
    const nieuweK = klem(k, MIN_K, MAX_K);
    return {
        k: nieuweK,
        tx: klem(tx, -(nieuweK - 1) * MAP_WIDTH, 0),
        ty: klem(ty, -(nieuweK - 1) * MAP_HEIGHT, 0),
    };
};

/**
 * Zoom while holding one viewBox point still. The content point under (cx, cy) is
 * p = (c - t)/k, so keeping it there at the new scale means t' = c - k'·p.
 */
const zoomRond = (view: MapView, cx: number, cy: number, nieuweK: number): MapView => ({
    k: nieuweK,
    tx: cx - (nieuweK / view.k) * (cx - view.tx),
    ty: cy - (nieuweK / view.k) * (cy - view.ty),
});

export function useMapView(wrapperRef: RefObject<HTMLDivElement | null>) {
    const [view, setView] = useState<MapView>(BEGINSTAND);

    const sleep = useRef<{ x: number; y: number; view: MapView; verplaatst: boolean } | null>(null);
    /** Set by a drag, read and cleared by the click that follows it. */
    const heeftGesleept = useRef(false);

    const zoomMet = useCallback((factor: number) => {
        setView((huidig) => klemView(zoomRond(huidig, MAP_WIDTH / 2, MAP_HEIGHT / 2, klem(huidig.k * factor, MIN_K, MAX_K))));
    }, []);

    const reset = useCallback(() => setView(BEGINSTAND), []);

    /**
     * Frame a region of the map — a province, say — as closely as the limits allow.
     *
     * Scale to whichever axis runs out first, then translate so the region's centre lands on
     * the frame's. The clamp still applies, so a region against the coast ends up against the
     * edge of the frame rather than centred with sea beyond it; that is the intent, not a
     * miss. A null or empty region means "show everything".
     */
    const zoomNaarVak = useCallback((vak: { x: number; y: number; width: number; height: number } | null) => {
        if (!vak || vak.width <= 0 || vak.height <= 0) {
            setView(BEGINSTAND);
            return;
        }
        const k = klem(Math.min(MAP_WIDTH / vak.width, MAP_HEIGHT / vak.height) * VULLING, MIN_K, MAX_K);
        setView(
            klemView({
                k,
                tx: MAP_WIDTH / 2 - k * (vak.x + vak.width / 2),
                ty: MAP_HEIGHT / 2 - k * (vak.y + vak.height / 2),
            }),
        );
    }, []);

    // Registered by hand rather than as an onWheel prop: React attaches wheel listeners at
    // the root as *passive*, so preventDefault() inside a JSX handler is silently ignored and
    // the page scrolls away under the cursor while the map zooms.
    useEffect(() => {
        const element = wrapperRef.current;
        if (!element) return;

        const onWheel = (event: WheelEvent) => {
            event.preventDefault();
            const rect = element.getBoundingClientRect();
            const { schaal, offsetX, offsetY } = meetVerhouding(rect);
            const cx = (event.clientX - rect.left - offsetX) / schaal;
            const cy = (event.clientY - rect.top - offsetY) / schaal;
            const deltaY = event.deltaMode === 1 ? event.deltaY * REGELS_NAAR_PIXELS : event.deltaY;
            // Exponential, so zoom is multiplicative and reversible: scrolling up and back
            // down by the same amount returns to exactly the scale you started at.
            setView((huidig) => klemView(zoomRond(huidig, cx, cy, klem(huidig.k * Math.exp(-deltaY * WHEEL_GEVOELIGHEID), MIN_K, MAX_K))));
        };

        element.addEventListener("wheel", onWheel, { passive: false });
        return () => element.removeEventListener("wheel", onWheel);
    }, [wrapperRef]);

    const onPointerDown = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            if (event.button !== 0) return;
            sleep.current = { x: event.clientX, y: event.clientY, view, verplaatst: false };
        },
        [view],
    );

    const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        const huidigeSleep = sleep.current;
        if (!huidigeSleep) return;

        const dx = event.clientX - huidigeSleep.x;
        const dy = event.clientY - huidigeSleep.y;
        if (!huidigeSleep.verplaatst && Math.hypot(dx, dy) > SLEEP_DREMPEL) {
            huidigeSleep.verplaatst = true;
            // Captured only once the pointer is genuinely dragging, never on a plain press.
            // Capturing on pointerdown would retarget the click that follows to this wrapper,
            // and the delegated handler reads the gemeente off the path the click landed on —
            // so every selection would silently do nothing.
            event.currentTarget.setPointerCapture(event.pointerId);
        }
        if (!huidigeSleep.verplaatst) return;

        const rect = event.currentTarget.getBoundingClientRect();
        // `meet` scales both axes by the same factor, so one divisor serves both — but it is
        // the meet scale, not rect.width / MAP_WIDTH, which is only equal when the container
        // happens to share the viewBox's aspect ratio. It does not.
        const naarGebruikerseenheden = 1 / meetVerhouding(rect).schaal;
        setView(
            klemView({
                k: huidigeSleep.view.k,
                tx: huidigeSleep.view.tx + dx * naarGebruikerseenheden,
                ty: huidigeSleep.view.ty + dy * naarGebruikerseenheden,
            }),
        );
    }, []);

    const onPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (sleep.current?.verplaatst) heeftGesleept.current = true;
        sleep.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    }, []);

    /** True when the click that just fired was the end of a drag, and should not select. */
    const wasSleep = useCallback(() => {
        if (!heeftGesleept.current) return false;
        heeftGesleept.current = false;
        return true;
    }, []);

    return {
        view,
        transform: `translate(${view.tx} ${view.ty}) scale(${view.k})`,
        kanUitzoomen: view.k > MIN_K,
        kanInzoomen: view.k < MAX_K,
        zoomIn: () => zoomMet(ZOOM_STAP),
        zoomUit: () => zoomMet(1 / ZOOM_STAP),
        reset,
        zoomNaarVak,
        wasSleep,
        pointerHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
    };
}
