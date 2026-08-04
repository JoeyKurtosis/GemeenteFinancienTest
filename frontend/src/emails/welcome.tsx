import React from "react";
import { Button, Section, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface WelcomeEmailProps {
    name?: string;
    loginUrl?: string;
}

export default function WelcomeEmail({ name = "daar", loginUrl = "https://gemeentefinancien.nl/login" }: WelcomeEmailProps) {
    return (
        <BaseLayout preview="Welkom bij Gemeentefinanciën">
            <Text style={heading}>Welkom bij Gemeentefinanciën</Text>

            <Text style={paragraph}>Beste {name},</Text>

            <Text style={paragraph}>
                Bedankt voor het aanmaken van je account. Je hebt nu toegang tot het dashboard dat inzicht biedt in de inkomsten en uitgaven van gemeenten
                in Nederland.
            </Text>

            <Section style={buttonContainer}>
                <Button style={button} href={loginUrl}>
                    Naar het dashboard
                </Button>
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

const signature = {
    margin: "0",
    fontSize: "15px",
    fontWeight: "600" as const,
    color: "#101828",
    lineHeight: "1.6",
};
