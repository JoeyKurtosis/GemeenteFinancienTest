import React from "react";
import { Hr, Section, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface TwoFactorCodeEmailProps {
    code?: string;
}

export default function TwoFactorCodeEmail({ code = "123456" }: TwoFactorCodeEmailProps) {
    return (
        <BaseLayout preview="Je verificatiecode voor Gemeentefinanciën">
            <Text style={heading}>Verificatiecode</Text>

            <Text style={paragraph}>Gebruik de volgende code om in te loggen bij je account:</Text>

            <Section style={codeContainer}>
                <Text style={codeText}>{code}</Text>
            </Section>

            <Section style={detailBox}>
                <Text style={detailLabel}>Geldigheid</Text>
                <Text style={detailValue}>Deze code is 10 minuten geldig.</Text>
                <Hr style={detailDivider} />
                <Text style={detailLabel}>Niet aangevraagd?</Text>
                <Text style={detailValue}>Als je niet hebt geprobeerd in te loggen, wijzig dan direct je wachtwoord.</Text>
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

const codeContainer = {
    textAlign: "center" as const,
    margin: "0 0 24px",
    padding: "20px",
    backgroundColor: "#f9fafb",
    border: "1px solid #e4e7ec",
    borderRadius: "8px",
};

const codeText = {
    margin: "0",
    fontSize: "36px",
    fontWeight: "700" as const,
    color: "#101828",
    letterSpacing: "8px",
    fontFamily: "'SF Mono', SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
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
