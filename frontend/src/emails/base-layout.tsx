import React from "react";
import { Body, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";

interface BaseLayoutProps {
    preview: string;
    children: ReactNode;
}

export function BaseLayout({ preview, children }: BaseLayoutProps) {
    return (
        <Html lang="nl">
            <Head />
            <Preview>{preview}</Preview>
            <Body style={body}>
                <Container style={container}>
                    <Section style={card}>{children}</Section>
                    <Section style={footer}>
                        <Text style={footerText}>
                            Dit is een automatisch gegenereerd bericht vanuit Gemeentefinanciën.
                            <br />
                            Reageer niet op dit e-mailadres.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

const body = {
    backgroundColor: "#f9fafb",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Helvetica, Arial, sans-serif",
    margin: "0",
    padding: "0",
    WebkitFontSmoothing: "antialiased" as const,
};

const container = {
    maxWidth: "580px",
    margin: "0 auto",
    padding: "40px 16px",
};

const card = {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e4e7ec",
    padding: "36px 40px 32px",
};

const footer = {
    padding: "24px 8px 0",
    textAlign: "center" as const,
};

const footerText = {
    margin: "0",
    fontSize: "12px",
    color: "#98a2b3",
    lineHeight: "1.6",
};
