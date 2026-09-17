import { UitlegSubContent } from "@/components/layout/uitleg-sub-content";
import type { BatenBron } from "../api";
import { BATEN_PAGINAS } from "./baten-charts";

/**
 * The `subContent` a Baten route hands to the PageHeader. Taking the bron rather than the copy
 * keeps BATEN_PAGINAS the single source of the text, and the type keeps the route's key in step
 * with the one its route view passes to BatenPageView.
 */
export const batenUitleg = (bron: BatenBron) => <UitlegSubContent paragraphs={BATEN_PAGINAS[bron].uitlegParagraphs} />;
