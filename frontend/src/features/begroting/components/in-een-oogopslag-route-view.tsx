import { ManagementoverzichtSection } from "@/features/managementoverzicht";
import { BegrotingPageView } from "./begroting-page-view";

/**
 * In één oogopslag: de begroting van de gemeente, gevolgd door het managementoverzicht.
 *
 * Twee secties met elk hun eigen fetch — de begrotingskaarten hangen aan `weergave`, het
 * managementoverzicht aan niets dan de filters — dus laden ze los van elkaar en houdt een fout
 * in de ene de andere niet van het scherm.
 */
export function InEenOogopslagRouteView() {
    return (
        <div className="flex flex-col gap-10">
            <BegrotingPageView weergave="overzicht" />
            <ManagementoverzichtSection />
        </div>
    );
}
