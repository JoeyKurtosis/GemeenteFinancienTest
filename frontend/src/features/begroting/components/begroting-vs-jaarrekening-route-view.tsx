import { useState } from "react";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import type { BegrotingWeergave } from "../api";
import { BegrotingPageView } from "./begroting-page-view";

const WEERGAVEN: { key: BegrotingWeergave; label: string }[] = [
    { key: "per-inwoner", label: "Euro per inwoner" },
    { key: "absolute-bedragen", label: "Absolute bedragen" },
];

/**
 * Begroting tegenover jaarrekening, in één pagina.
 *
 * De eenheid is het enige verschil tussen de twee weergaven — dezelfde zeven kaarten, een andere
 * meting (zie BEGROTING_WEERGAVEN in iv3/queries.py) — dus is het een knop op de pagina en geen
 * tweede route. De stand blijft lokaal: de query string is van de filters, die layout-breed
 * gelden, en useChartQuery cachet per weergave, dus terugschakelen kost geen request.
 */
export function BegrotingVsJaarrekeningRouteView() {
    const [weergave, setWeergave] = useState<BegrotingWeergave>("per-inwoner");

    return (
        <BegrotingPageView
            weergave={weergave}
            header={
                <ButtonGroup
                    size="sm"
                    aria-label="Weergave"
                    disallowEmptySelection
                    selectedKeys={new Set([weergave])}
                    onSelectionChange={(keys) => {
                        const [gekozen] = keys;
                        if (gekozen) setWeergave(gekozen as BegrotingWeergave);
                    }}
                >
                    {WEERGAVEN.map((optie) => (
                        <ButtonGroupItem key={optie.key} id={optie.key}>
                            {optie.label}
                        </ButtonGroupItem>
                    ))}
                </ButtonGroup>
            }
        />
    );
}
