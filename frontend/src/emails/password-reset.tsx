import React from "react";
import { Button, Link, Section, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";
import { button, buttonContainer, heading, link, mutedText, paragraph, signature } from "./theme";

interface PasswordResetEmailProps {
    resetUrl?: string;
}

export default function PasswordResetEmail({ resetUrl = "https://gemeentefinancien.test.kurtosis.nl/password-reset?token=example" }: PasswordResetEmailProps) {
    return (
        <BaseLayout preview="Reset je wachtwoord voor Gemeentefinanciën">
            <Text style={heading}>Wachtwoord resetten</Text>

            <Text style={paragraph}>
                Je hebt een aanvraag gedaan om je wachtwoord te resetten. Gebruik de knop hieronder om een nieuw wachtwoord in te stellen.
            </Text>

            <Section style={buttonContainer}>
                <Button style={button} href={resetUrl}>
                    Wachtwoord resetten
                </Button>
            </Section>

            {/* Spelling the URL out is not just a fallback for clients that strip the button: a
                reset mail with no visible destination reads as phishing. */}
            <Text style={mutedText}>Werkt de knop niet? Plak deze link in je browser:</Text>
            <Text style={fallbackLinkContainer}>
                <Link style={link} href={resetUrl}>
                    {resetUrl}
                </Link>
            </Text>

            <Text style={mutedText}>Deze link is 1 uur geldig. Als je dit niet hebt aangevraagd, kun je deze e-mail negeren.</Text>

            <Text style={closing}>Met vriendelijke groet,</Text>
            <Text style={signature}>Het Gemeentefinanciën team</Text>
        </BaseLayout>
    );
}

const fallbackLinkContainer = {
    margin: "0 0 24px",
    fontSize: "14px",
    lineHeight: "1.5",
};

const closing = {
    ...paragraph,
    margin: "24px 0 4px",
};
