import { Outlet, createRootRoute } from "@tanstack/react-router";
import { NotFoundPage } from "@/components/layout/not-found-page";
import { AuthProvider } from "@/features/auth";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "@/components/application/notifications/toaster";

export const Route = createRootRoute({
    component: RootComponent,
    notFoundComponent: NotFoundPage,
});

function RootComponent() {
    return (
        <ThemeProvider>
            <AuthProvider>
                {/* The assistant runtime lives in _layout, not here: its adapter needs the
                    applied filters, and FiltersProvider is mounted below this point. */}
                <Outlet />
                <Toaster />
            </AuthProvider>
        </ThemeProvider>
    );
}
