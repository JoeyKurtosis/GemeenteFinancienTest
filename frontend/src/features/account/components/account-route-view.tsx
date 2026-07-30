import { Navigate } from "@tanstack/react-router";
import { Tabs } from "@/components/application/tabs/tabs";
import { useAuth } from "@/features/auth";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { AccountHeader } from "./account-header";
import { PasswordSection } from "./password-section";
import { ProfileSection } from "./profile-section";

export function AccountRouteView() {
    useDocumentTitle("Account");

    const { isAuthenticated, isLoading } = useAuth();

    if (!isLoading && !isAuthenticated) {
        return <Navigate to="/login" />;
    }

    return (
        <div className="mx-auto flex w-full flex-col">
            <AccountHeader />

            <Tabs className="mt-8" defaultSelectedKey="account">
                <Tabs.List type="underline">
                    <Tabs.Item id="account">Account</Tabs.Item>
                    <Tabs.Item id="facturering">Facturering</Tabs.Item>
                </Tabs.List>

                <Tabs.Panel id="account" className="pt-8">
                    <div className="flex flex-col">
                        <ProfileSection />
                        <PasswordSection />
                    </div>
                </Tabs.Panel>

                <Tabs.Panel id="facturering" className="pt-8">
                    <div className="flex flex-col items-center gap-2 rounded-2xl border border-secondary py-16 text-center">
                        <h2 className="text-lg font-semibold text-primary">Binnenkort beschikbaar</h2>
                        <p className="max-w-sm text-sm text-tertiary">Hier beheer je binnenkort je betaalgegevens voor de AI-chatbot.</p>
                    </div>
                </Tabs.Panel>
            </Tabs>
        </div>
    );
}
