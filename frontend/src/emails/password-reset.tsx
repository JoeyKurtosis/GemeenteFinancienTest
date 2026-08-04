import React from "react";
import { Button, Hr, Section, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface PasswordResetEmailProps {
    resetUrl?: string;
}

export default function PasswordResetEmail({ resetUrl = "https://gemeentefinancien.nl/password-reset?token=example" }: PasswordResetEmailProps) {
    return (
        <BaseLayout preview="Reset je wachtwoord voor Gemeentefinanciën">
            <Text style={heading}>Wachtwoord resetten</Text>

            <Text style={paragraph}>Je hebt een aanvraag gedaan om je wachtwoord te resetten.</Text>

            <Text style={paragraph}>Gebruik de knop hieronder om een nieuw wachtwoord in te stellen:</Text>

            <Section style={buttonContainer}>
                <Button style={button} href={resetUrl}>
                    Wachtwoord resetten
                </Button>
            </Section>

            <Section style={detailBox}>
                <Text style={detailLabel}>Geldigheid</Text>
                <Text style={detailValue}>Deze link is 1 uur geldig.</Text>
                <Hr style={detailDivider} />
                <Text style={detailLabel}>Niet aangevraagd?</Text>
                <Text style={detailValue}>Als je dit niet hebt aangevraagd, kun je deze e-mail negeren.</Text>
            </Section>

            <Text style={paragraph}>Met vriendelijke groet,</Text>
            <Text style={signature}>Het Gemeentefinanciën team</Text>
        </BaseLayout>
    );
}

const heading = {
    margin: "0 0 20px",
    fontSize: "22px",
    fontWeight: "600" as const,
    color: "#101828",
    lineHeight: "1.35",
};

const paragraph = {
    margin: "0 0 16px",
    fontSize: "15px",
    color: "#475467",
    lineHeight: "1.6",
};

const buttonContainer = {
    margin: "0 0 24px",
};

const button = {
    display: "inline-block" as const,
    padding: "12px 18px",
    borderRadius: "8px",
    backgroundColor: "#101828",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "600" as const,
    textDecoration: "none",
};

const detailBox = {
    backgroundColor: "#f9fafb",
    border: "1px solid #e4e7ec",
    borderRadius: "8px",
    padding: "14px 20px",
    marginBottom: "28px",
};

const detailLabel = {
    margin: "0 0 2px",
    fontSize: "12px",
    fontWeight: "600" as const,
    color: "#98a2b3",
    letterSpacing: "0.4px",
    textTransform: "uppercase" as const,
};

const detailValue = {
    margin: "0",
    fontSize: "14px",
    color: "#344054",
    lineHeight: "1.6",
};

const detailDivider = {
    borderColor: "#e4e7ec",
    margin: "12px 0",
};

const signature = {
    margin: "0",
    fontSize: "15px",
    fontWeight: "600" as const,
    color: "#101828",
    lineHeight: "1.6",
};
