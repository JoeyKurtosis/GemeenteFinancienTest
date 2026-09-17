import { Navigate } from "@tanstack/react-router";
import { Tabs } from "@/components/application/tabs/tabs";
import { useAuth } from "@/features/auth";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { AccountHeader } from "./account-header";
import { DeleteAccountSection } from "./delete-account-section";
import { NotesSection } from "./notes-section";
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
                    <Tabs.Item id="notities">Notities</Tabs.Item>
                </Tabs.List>

                <Tabs.Panel id="account" className="pt-8">
                    <div className="flex flex-col">
                        <ProfileSection />
                        <PasswordSection />
                        <DeleteAccountSection />
                    </div>
                </Tabs.Panel>

                <Tabs.Panel id="notities" className="pt-8">
                    <NotesSection />
                </Tabs.Panel>
            </Tabs>
        </div>
    );
}
