import React from "react";
import { Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";
import { heading, paragraph, signature } from "./theme";

interface AccountDeletedEmailProps {
    name?: string;
}

export default function AccountDeletedEmail({ name = "daar" }: AccountDeletedEmailProps) {
    return (
        <BaseLayout preview="Je account bij Gemeentefinanciën is verwijderd">
            <Text style={heading}>Je account is verwijderd</Text>

            <Text style={paragraph}>Beste {name},</Text>

            <Text style={paragraph}>
                Je account bij Gemeentefinanciën is verwijderd. Je persoonlijke gegevens en je notities zijn permanent gewist en zijn niet meer terug te halen.
            </Text>

            {/* No call to action: the account this was sent about no longer exists, so a button back
                into the app would only land on a login that can never succeed. */}
            <Text style={paragraph}>Heb je dit niet zelf gedaan? Neem dan contact met ons op.</Text>

            <Text style={closing}>Met vriendelijke groet,</Text>
            <Text style={signature}>Het Gemeentefinanciën team</Text>
        </BaseLayout>
    );
}

const closing = {
    ...paragraph,
    margin: "0 0 4px",
};
