import React from "react";
import type { ReactNode } from "react";
import { Body, Container, Head, Hr, Html, Img, Preview, Section, Text } from "@react-email/components";
import { LOGO_HEIGHT, LOGO_URL, LOGO_WIDTH, colors, divider, fontFamily } from "./theme";

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
                    <Section style={logoHeader}>
                        <Img src={LOGO_URL} width={LOGO_WIDTH} height={LOGO_HEIGHT} alt="Venster" style={logo} />
                    </Section>

                    <Section style={card}>
                        {children}

                        <Hr style={divider} />

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
    backgroundColor: colors.gray100,
    fontFamily,
    margin: "0",
    padding: "0",
    WebkitFontSmoothing: "antialiased" as const,
};

const container = {
    maxWidth: "600px",
    margin: "0 auto",
    padding: "40px 16px",
};

const logoHeader = {
    padding: "0 0 24px",
};

const logo = {
    display: "block" as const,
};

const card = {
    backgroundColor: colors.white,
    borderRadius: "12px",
    border: `1px solid ${colors.gray200}`,
    padding: "40px",
};

const footerText = {
    margin: "0",
    fontSize: "14px",
    color: colors.gray500,
    lineHeight: "1.5",
};
