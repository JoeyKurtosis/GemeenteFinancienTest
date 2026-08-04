/**
 * Renders react-email templates to static HTML files that the Django backend can use
 * with Django's template engine (variables are inserted as {{ var }} placeholders).
 *
 * Run: npx tsx scripts/build-emails.tsx
 */
import React from "react";
import { render } from "@react-email/components";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

import PasswordResetEmail from "../src/emails/password-reset";
import TwoFactorCodeEmail from "../src/emails/two-factor-code";
import WelcomeEmail from "../src/emails/welcome";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, "../../backend/users/templates/emails");

const templates: Record<string, { element: React.ReactElement; plainText: string }> = {
    "password-reset.html": {
        element: PasswordResetEmail({ resetUrl: "{{ reset_url }}" }),
        plainText: [
            "Je hebt een aanvraag gedaan om je wachtwoord te resetten.",
            "",
            "Gebruik deze link om een nieuw wachtwoord in te stellen:",
            "{{ reset_url }}",
            "",
            "Deze link is 1 uur geldig.",
            "Als je dit niet hebt aangevraagd, kun je deze e-mail negeren.",
            "",
            "Met vriendelijke groet,",
            "Het Gemeentefinanciën team",
        ].join("\n"),
    },
    "two-factor-code.html": {
        element: TwoFactorCodeEmail({ code: "{{ code }}" }),
        plainText: [
            "Je verificatiecode is: {{ code }}",
            "",
            "Deze code is 10 minuten geldig.",
            "Als je niet hebt geprobeerd in te loggen, wijzig dan direct je wachtwoord.",
            "",
            "Met vriendelijke groet,",
            "Het Gemeentefinanciën team",
        ].join("\n"),
    },
    "welcome.html": {
        element: WelcomeEmail({ name: "{{ name }}", loginUrl: "{{ login_url }}" }),
        plainText: [
            "Beste {{ name }},",
            "",
            "Bedankt voor het aanmaken van je account bij Gemeentefinanciën.",
            "Je hebt nu toegang tot het dashboard.",
            "",
            "Log in via: {{ login_url }}",
            "",
            "Met vriendelijke groet,",
            "Het Gemeentefinanciën team",
        ].join("\n"),
    },
};

async function main() {
    mkdirSync(OUTPUT_DIR, { recursive: true });

    for (const [filename, { element, plainText }] of Object.entries(templates)) {
        const html = await render(element);
        writeFileSync(resolve(OUTPUT_DIR, filename), html, "utf-8");

        const txtFilename = filename.replace(".html", ".txt");
        writeFileSync(resolve(OUTPUT_DIR, txtFilename), plainText, "utf-8");

        console.log(`  ✓ ${filename}`);
    }

    console.log(`\nEmail templates written to ${OUTPUT_DIR}`);
}

main();
