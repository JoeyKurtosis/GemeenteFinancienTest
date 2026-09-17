import React from "react";
import { Section, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";
import { codePanel, codeText, heading, mutedText, paragraph } from "./theme";

interface TwoFactorCodeEmailProps {
    code?: string;
}

export default function TwoFactorCodeEmail({ code = "123456" }: TwoFactorCodeEmailProps) {
    return (
        <BaseLayout preview="Je verificatiecode voor Gemeentefinanciën">
            <Text style={heading}>Verificatiecode</Text>

            {/* This template is shared by login 2FA and signup confirmation, so the copy has to
                read correctly for someone who has no account yet as well as for someone who does. */}
            <Text style={paragraph}>Gebruik de volgende code om door te gaan:</Text>

            <Section style={codePanel}>
                <Text style={codeText}>{code}</Text>
            </Section>

            <Text style={mutedText}>Deze code is 10 minuten geldig.</Text>
        </BaseLayout>
    );
}
