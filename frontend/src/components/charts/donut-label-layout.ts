/**
 * Placement of the outside slice labels on a donut — the leader line from the ring out to a
 * figure like "€ 359 (47%)".
 *
 * Recharts hands its label renderer one slice at a time, but two labels only collide in
 * relation to each other, so the whole ring has to be laid out at once. That is why the slice
 * angles are derived here rather than read off the props: we need all of them before we can
 * place any one of them.
 */

const RADIAN = Math.PI / 180;

/** Gap between the ring and the start of the leader line. */
const RING_GAP = 3;
/** How far out the leader runs before it bends level with its label. */
const KNEE = 14;
/** Where the text begins, measured out from the ring. */
const TEXT_OFFSET = 28;
/** Least vertical room a label needs; any closer and two labels read as one. */
const LINE_HEIGHT = 15;

export interface DonutGeometry {
    cx: number;
    cy: number;
    outerRadius: number;
    /** Highest and lowest a label may sit, in chart pixels — the plot area's own bounds. */
    top: number;
    bottom: number;
}

/** One slice's leader line, in chart pixels. Null for slices with nothing to point at. */
export interface SliceLabel {
    /** Where the line leaves the ring. */
    from: { x: number; y: number };
    /** The bend, out along the slice's own radius and level with the text. */
    knee: { x: number; y: number };
    /** Where the line stops and the text begins. */
    to: { x: number; y: number };
    /** 1 when the label sits to the right of the ring, -1 to the left. */
    side: 1 | -1;
}

function polar(cx: number, cy: number, radius: number, angle: number) {
    return { x: cx + radius * Math.cos(-angle * RADIAN), y: cy + radius * Math.sin(-angle * RADIAN) };
}

/**
 * The mid-angle of every slice, derived from the same props recharts derives its sectors from:
 * one padding gap per slice comes out of the full turn, and what is left is split by share.
 * Mirrors `Pie`'s own sector maths so the leader lines meet the slices they belong to.
 */
export function sliceMidAngles(values: number[], startAngle: number, endAngle: number, paddingAngle: number): number[] {
    const total = values.reduce((sum, value) => sum + value, 0);
    const absDelta = Math.min(Math.abs(endAngle - startAngle), 360);
    const sign = endAngle < startAngle ? -1 : 1;
    const padding = values.length <= 1 ? 0 : paddingAngle;
    const notZeroCount = values.filter((value) => value !== 0).length;
    // A full turn has no seam, so it pays for a gap after the last slice as well as between.
    const realTotalAngle = absDelta - (absDelta >= 360 ? notZeroCount : notZeroCount - 1) * padding;

    let previousEnd = startAngle;
    return values.map((value, index) => {
        const start = index === 0 ? startAngle : previousEnd + sign * padding * (value !== 0 ? 1 : 0);
        const end = start + sign * (total > 0 ? (value / total) * realTotalAngle : 0);
        previousEnd = end;
        return (start + end) / 2;
    });
}

/**
 * Where each slice's label and leader line go. Returns one entry per slice, in slice order, so
 * the caller can look its own index up; slices with no value get null, since a leader line
 * pointing at a sector of zero width points at nothing.
 */
export function sliceLabelLayout(midAngles: number[], values: number[], { cx, cy, outerRadius, top, bottom }: DonutGeometry): (SliceLabel | null)[] {
    const placements = midAngles.map((angle, index) => {
        const knee = polar(cx, cy, outerRadius + KNEE, angle);
        return {
            index,
            empty: values[index] === 0,
            from: polar(cx, cy, outerRadius + RING_GAP, angle),
            kneeX: knee.x,
            y: knee.y,
            side: (knee.x >= cx ? 1 : -1) as 1 | -1,
        };
    });

    // Slices that resolve to nearly the same height would print over each other, so each flank
    // is spread until every label has a line to itself. The order along the flank is preserved
    // throughout — a label never overtakes the one above it, which is what keeps the leader
    // lines fanning out neatly instead of crossing.
    for (const side of [1, -1] as const) {
        const flank = placements.filter((placement) => placement.side === side && !placement.empty).sort((a, b) => a.y - b.y);
        if (flank.length === 0) continue;

        for (let i = 1; i < flank.length; i++) {
            flank[i].y = Math.max(flank[i].y, flank[i - 1].y + LINE_HEIGHT);
        }
        // Pushing down alone piles the overflow onto the bottom label, so anything driven past
        // the plot area is walked back up and the crowding is shared across the flank.
        const last = flank.length - 1;
        if (flank[last].y > bottom) {
            flank[last].y = bottom;
            for (let i = last - 1; i >= 0; i--) {
                flank[i].y = Math.min(flank[i].y, flank[i + 1].y - LINE_HEIGHT);
            }
        }
        if (flank[0].y < top) {
            flank[0].y = top;
            for (let i = 1; i < flank.length; i++) {
                flank[i].y = Math.max(flank[i].y, flank[i - 1].y + LINE_HEIGHT);
            }
        }
    }

    return placements.map((placement) => {
        if (placement.empty) return null;

        // Once a label has been moved, its bend may no longer clear the ring, and a level run
        // starting inside the ring would be drawn straight across the donut. This is how far
        // the ring reaches from the centre at the label's height, so the bend can stay outside.
        const dy = placement.y - cy;
        const ringHalfWidth = Math.sqrt(Math.max(0, (outerRadius + RING_GAP) ** 2 - dy ** 2));
        const kneeX = cx + placement.side * Math.max(Math.abs(placement.kneeX - cx), ringHalfWidth + RING_GAP);

        return {
            from: placement.from,
            knee: { x: kneeX, y: placement.y },
            to: { x: cx + placement.side * (outerRadius + TEXT_OFFSET), y: placement.y },
            side: placement.side,
        };
    });
}
