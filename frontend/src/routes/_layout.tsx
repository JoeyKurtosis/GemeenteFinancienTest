import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { useRouteMetadata } from "@/hooks/use-route-metadata";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { AssistantModal } from "@/components/assistant-ui/assistant-modal";
import { useAuth } from "@/features/auth";
import { FiltersProvider, validateFiltersSearch } from "@/features/filters";
import { AssistantProvider } from "@/features/assistant";

function LayoutComponent() {
    const { title, description, showBreadCrumbs, actions, crumbLabels, subContent } = useRouteMetadata();
    const { isAuthenticated } = useAuth();

    useDocumentTitle(title);

    return (
        <FiltersProvider>
            {/* Inside FiltersProvider so the chat adapter can send the applied filters as
                context — that is what lets "mijn gemeente" resolve to the selected one. */}
            <AssistantProvider>
                <div className="flex w-full">
                    <AppSidebar />
                    <main className="w-full min-w-0 flex-1 overflow-x-clip px-4 pt-18 pb-16 sm:px-6 lg:px-10 lg:pt-8">
                        {title && (
                            <PageHeader title={title} description={description} showBreadCrumbs={showBreadCrumbs} actions={actions} crumbLabels={crumbLabels}>
                                {subContent}
                            </PageHeader>
                        )}
                        <Outlet />
                    </main>
                    {isAuthenticated && <AssistantModal />}
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
