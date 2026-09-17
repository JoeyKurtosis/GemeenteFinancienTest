import { UitlegSubContent } from "@/components/layout/uitleg-sub-content";
import type { LastenTaakveld } from "../api";
import { LASTEN_PAGINAS } from "./lasten-charts";

/**
 * The `subContent` a Lasten route hands to the PageHeader. Taking the taakveld rather than the
 * copy keeps LASTEN_PAGINAS the single source of the text, and the type keeps the route's key
 * in step with the one its route view passes to LastenPageView.
 */
export const lastenUitleg = (taakveld: LastenTaakveld) => <UitlegSubContent paragraphs={LASTEN_PAGINAS[taakveld].uitlegParagraphs} />;
