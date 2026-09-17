import { Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import { AssistantModal } from "@/components/assistant-ui/assistant-modal";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { AssistantProvider } from "@/features/assistant";
import { FiltersProvider, validateFiltersSearch } from "@/features/filters";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useRouteMetadata } from "@/hooks/use-route-metadata";

function LayoutComponent() {
    const isAssistantPage = useLocation({ select: (location) => location.pathname.replace(/\/$/, "") === "/assistent" });
    const { title, description, showBreadCrumbs, actions, crumbLabels, subContent } = useRouteMetadata();
    useDocumentTitle(title);

    return (
        <FiltersProvider>
            {/* Inside FiltersProvider so the chat adapter can send the applied filters as
                context — that is what lets "mijn gemeente" resolve to the selected one. */}
            <AssistantProvider>
                <div className="flex w-full">
                    <AppSidebar />
                    <main
                        id="main-content"
                        tabIndex={-1}
                        className={`w-full min-w-0 flex-1 outline-none ${isAssistantPage ? "flex h-dvh min-h-0 flex-col overflow-hidden pt-14 lg:pt-0" : "overflow-x-clip px-4 pt-18 pb-16 sm:px-6 lg:px-10 lg:pt-8"}`}
                    >
                        {title && (
                            <div className={isAssistantPage ? "shrink-0 px-4 pt-4 sm:px-6 lg:px-10 lg:pt-8" : undefined}>
                            <PageHeader title={title} description={description} showBreadCrumbs={showBreadCrumbs} actions={actions} crumbLabels={crumbLabels}>
                                {subContent}
                            </PageHeader>
                            </div>
                        )}
                        <Outlet />
                    </main>
                    {!isAssistantPage && <AssistantModal />}
                </div>
            </AssistantProvider>
        </FiltersProvider>
    );
}

export const Route = createFileRoute("/_layout")({
    // Declared here so every page under the layout inherits the filter search params.
    validateSearch: validateFiltersSearch,
    component: LayoutComponent,
});
