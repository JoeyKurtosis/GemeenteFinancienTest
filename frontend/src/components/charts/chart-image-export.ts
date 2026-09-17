import { toJpeg } from "html-to-image";

/** Capture a styled copy so exporting never changes the visible chart or its scroll position. */
export async function downloadChartImage(node: HTMLElement, title: string, fileName: string): Promise<void> {
    await document.fonts.ready;
    if (!node.isConnected || node.getBoundingClientRect().width === 0) throw new Error("Grafiek is niet zichtbaar");

    const copy = node.cloneNode(true) as HTMLElement;
    const originals = [node, ...node.querySelectorAll<HTMLElement | SVGElement>("*")];
    const copies = [copy, ...copy.querySelectorAll<HTMLElement | SVGElement>("*")];
    originals.forEach((original, index) => {
        const style = getComputedStyle(original);
        const target = copies[index];
        // Freeze computed styles, including SVG colors and container-query layout, before
        // moving the copy outside its card/modal. Never copy event handlers or React state.
        for (const property of style) target.style.setProperty(property, style.getPropertyValue(property));
        target.style.animation = "none";
        target.style.transition = "none";
    });

    // Expand scrollable bars and legends in the copy, including their containing blocks.
    originals.forEach((original, index) => {
        if (!/auto|scroll/.test(getComputedStyle(original).overflowY)) return;
        let target: HTMLElement | SVGElement | null = copies[index];
        while (target) {
            target.style.height = "auto";
            target.style.maxHeight = "none";
            target.style.overflowY = "visible";
            if (target === copy) break;
            target = target.parentElement;
        }
    });
    copy.querySelectorAll(".recharts-tooltip-wrapper, .recharts-tooltip-cursor").forEach((element) => element.remove());

    const frame = document.createElement("div");
    // Resolve theme tokens on the original node; they may be scoped to an ancestor.
    const theme = getComputedStyle(node);
    Object.assign(frame.style, {
        position: "fixed",
        left: "-100000px",
        top: "0",
        padding: "24px",
        width: `${node.getBoundingClientRect().width + 48}px`,
        boxSizing: "border-box",
        backgroundColor: theme.getPropertyValue("--color-bg-primary").trim() || "white",
        color: theme.getPropertyValue("--color-text-primary").trim() || theme.color,
        fontFamily: theme.fontFamily,
        pointerEvents: "none",
    });
    frame.setAttribute("aria-hidden", "true");
    const heading = document.createElement("h3");
    heading.textContent = title;
    Object.assign(heading.style, { margin: "0 0 16px", fontSize: "18px", lineHeight: "26px", fontWeight: "600", overflowWrap: "anywhere" });
    frame.append(heading, copy);
    document.body.append(frame);
    try {
        const url = await toJpeg(frame, {
            pixelRatio: 2,
            quality: 0.95,
            backgroundColor: getComputedStyle(frame).backgroundColor,
            style: { position: "static", left: "auto", top: "auto" },
        });
        const link = document.createElement("a");
        link.download = fileName;
        link.href = url;
        link.click();
    } finally {
        frame.remove();
    }
}
