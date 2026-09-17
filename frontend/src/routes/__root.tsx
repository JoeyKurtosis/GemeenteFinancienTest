import { useEffect, useRef } from "react";
import { Outlet, createRootRoute, useRouterState } from "@tanstack/react-router";
import { NotFoundPage } from "@/components/layout/not-found-page";
import { AuthProvider } from "@/features/auth";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "@/components/application/notifications/toaster";

export const Route = createRootRoute({
    component: RootComponent,
    notFoundComponent: NotFoundPage,
});

function RootComponent() {
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    const previousPathname = useRef(pathname);

    useEffect(() => {
        if (previousPathname.current === pathname) return;
        previousPathname.current = pathname;
        const frame = requestAnimationFrame(() => document.getElementById("main-content")?.focus());
        return () => cancelAnimationFrame(frame);
    }, [pathname]);

    return (
        <ThemeProvider>
            <AuthProvider>
                <a
                    href="#main-content"
                    className="fixed top-2 left-2 z-100 -translate-y-20 rounded-lg bg-primary px-4 py-2 font-semibold text-primary shadow-lg outline-2 outline-focus-ring focus:translate-y-0"
                >
                    Naar hoofdinhoud
                </a>
                {/* The assistant runtime lives in _layout, not here: its adapter needs the
                    applied filters, and FiltersProvider is mounted below this point. */}
                <Outlet />
                <Toaster />
            </AuthProvider>
        </ThemeProvider>
    );
}
