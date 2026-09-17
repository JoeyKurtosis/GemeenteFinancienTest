/**
 * Shared tokens and style objects for the transactional emails.
 *
 * Email clients strip <style> blocks and class names, so everything here is a plain style object
 * that react-email inlines onto the element. That is also why these are duplicated values rather
 * than references to theme.css — the build output has to stand alone in an inbox.
 */

/**
 * Absolute URL, because a mail client has no origin to resolve a relative path against.
 *
 * The file it points at is `frontend/public/venster-logo.png`, which Vite copies verbatim to the
 * build output and the deploy serves at the domain root. Baked in at build time rather than
 * passed through Django as a `{{ }}` placeholder, so the react-email preview and the generated
 * production HTML are identical. Pointing the mails at a different host is this one line plus
 * `npm run build:emails`.
 */
export const LOGO_URL = "https://gemeentefinancien.test.kurtosis.nl/venster-logo.png";

/** The logo is a 360x90 PNG, rendered here at well under half size so it stays crisp on retina
 *  displays. Both dimensions have to be set as HTML attributes too — Outlook ignores CSS sizing. */
export const LOGO_WIDTH = 128;
export const LOGO_HEIGHT = 32;

export const colors = {
    // Untitled UI grays.
    gray50: "#fafafa",
    gray100: "#f5f5f5",
    gray200: "#e9eaeb",
    gray300: "#d5d7da",
    gray500: "#717680",
    gray600: "#535862",
    gray700: "#414651",
    gray900: "#181d27",

    // Brand teal, matching --color-brand-* in src/styles/theme.css. `brandSolid` is the frontend's
    // --color-bg-brand-solid (brand-700), so an email button and a dashboard button are the same fill.
    brandSolid: "#107e7a",
    brandLink: "#139d98",

    white: "#ffffff",
};

export const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Helvetica, Arial, sans-serif";

export const monoFontFamily = "'SF Mono', SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

export const heading = {
    margin: "0 0 12px",
    fontSize: "24px",
    fontWeight: "600" as const,
    color: colors.gray900,
    lineHeight: "1.33",
};

export const paragraph = {
    margin: "0 0 16px",
    fontSize: "16px",
    color: colors.gray600,
    lineHeight: "1.5",
};

/** Supporting text — validity windows, "didn't request this?", button fallbacks. */
export const mutedText = {
    margin: "0 0 8px",
    fontSize: "14px",
    color: colors.gray500,
    lineHeight: "1.5",
};

export const buttonContainer = {
    margin: "0 0 24px",
};

export const button = {
    display: "inline-block" as const,
    padding: "12px 20px",
    borderRadius: "8px",
    backgroundColor: colors.brandSolid,
    color: colors.white,
    fontSize: "16px",
    fontWeight: "600" as const,
    lineHeight: "1.5",
    textDecoration: "none",
};

export const link = {
    color: colors.brandLink,
    fontSize: "14px",
    textDecoration: "underline",
    wordBreak: "break-all" as const,
};

export const signature = {
    margin: "0",
    fontSize: "16px",
    fontWeight: "600" as const,
    color: colors.gray900,
    lineHeight: "1.5",
};

export const divider = {
    borderColor: colors.gray200,
    margin: "32px 0 24px",
};

export const codePanel = {
    textAlign: "center" as const,
    margin: "0 0 16px",
    padding: "24px",
    backgroundColor: colors.gray50,
    border: `1px solid ${colors.gray200}`,
    borderRadius: "12px",
};

export const codeText = {
    margin: "0",
    fontSize: "36px",
    fontWeight: "700" as const,
    color: colors.gray900,
    // The trailing letter-spacing pushes the block visually off-centre; the matching left padding
    // cancels it out so the code sits centred in the panel.
    letterSpacing: "10px",
    paddingLeft: "10px",
    lineHeight: "1.2",
    fontFamily: monoFontFamily,
};
