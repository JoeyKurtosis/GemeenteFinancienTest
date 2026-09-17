import { Plus } from "@untitledui/icons";
import { Button as AriaButton } from "react-aria-components";
import { BadgeWithIcon } from "@/components/base/badges/badges";
import { cx } from "@/utils/cx";
import type { FieldInfo } from "../types";

interface FieldPaletteProps {
    fields: FieldInfo[];
    /** Plakt de veldnaam in de formule waar de cursor staat. */
    onInsert: (name: string) => void;
    className?: string;
}

/**
 * De beschikbare velden als klikbare chips onder de formule-invoer. Leunt op de badge-taal van
 * Untitled UI, zodat een veldnaam er hetzelfde uitziet als elk ander label in de app; de
 * beschrijving zit in het toegankelijke label, want de chips staan er met zeventien tegelijk.
 */
export function FieldPalette({ fields, onInsert, className }: FieldPaletteProps) {
    return (
        <div className={cx("flex flex-wrap gap-1.5", className)}>
            {fields.map((field) => (
                <AriaButton
                    key={field.name}
                    onPress={() => onInsert(field.name)}
                    aria-label={`${field.name} invoegen — ${field.description}`}
                    className="group cursor-pointer rounded-md outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                    <BadgeWithIcon
                        size="sm"
                        type="color"
                        color="gray"
                        iconLeading={Plus}
                        className="font-mono transition duration-100 ease-linear group-hover:bg-utility-brand-50 group-hover:text-utility-brand-700 group-hover:ring-utility-brand-200"
                    >
                        {field.name}
                    </BadgeWithIcon>
                </AriaButton>
            ))}
        </div>
    );
}
