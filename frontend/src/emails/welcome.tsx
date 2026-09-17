import React from "react";
import { Button, Section, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";
import { button, buttonContainer, heading, paragraph, signature } from "./theme";

interface WelcomeEmailProps {
    name?: string;
    loginUrl?: string;
}

export default function WelcomeEmail({ name = "daar", loginUrl = "https://gemeentefinancien.test.kurtosis.nl/login" }: WelcomeEmailProps) {
    return (
        <BaseLayout preview="Welkom bij Gemeentefinanciën">
            <Text style={heading}>Welkom bij Gemeentefinanciën</Text>

            <Text style={paragraph}>Beste {name},</Text>

            <Text style={paragraph}>
                Bedankt voor het aanmaken van je account. Je hebt nu toegang tot het dashboard dat inzicht biedt in de inkomsten en uitgaven van gemeenten in
                Nederland.
            </Text>

            <Section style={buttonContainer}>
                <Button style={button} href={loginUrl}>
                    Naar het dashboard
                </Button>
            </Section>

            <Text style={closing}>Met vriendelijke groet,</Text>
            <Text style={signature}>Het Gemeentefinanciën team</Text>
        </BaseLayout>
    );
}

const closing = {
    ...paragraph,
    margin: "0 0 4px",
};
