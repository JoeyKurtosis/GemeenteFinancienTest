/** "4 augustus 2026" — the day a note was last edited is as fine as these are read. */
const datumFormat = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" });

/** When a comment was last saved, spelled the same way wherever a note is shown. */
export function formatCommentDate(isoDate: string): string {
    return datumFormat.format(new Date(isoDate));
}
