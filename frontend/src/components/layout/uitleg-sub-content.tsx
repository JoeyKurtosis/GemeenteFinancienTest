/**
 * The page's uitleg, rendered under the title in the PageHeader rather than as a card in the
 * chart grid. PageHeader already wraps its children in `mt-1 text-sm text-tertiary`, so only
 * the measure and the paragraph rhythm live here.
 */
export function UitlegSubContent({ paragraphs }: { paragraphs: string[] }) {
    return (
        <div className="max-w-3xl space-y-1">
            {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
            ))}
        </div>
    );
}
