import type { PropsWithChildren } from "react";
import { RouterProvider } from "react-aria-components";
import { useNavigate, useRouter } from "@tanstack/react-router";

export const RouteProvider = ({ children }: PropsWithChildren) => {
    const navigate = useNavigate();
    const router = useRouter();

    return (
        // `search: true` carries the query string across every React Aria component that
        // navigates by href. The applied filters live there, so without it a link resets the
        // whole sidebar — the same reason the nav items and breadcrumbs pass it.
        <RouterProvider
            navigate={(to) => navigate({ to, search: true })}
            useHref={(to) => router.buildLocation({ to, search: true }).href}
        >
            {children}
        </RouterProvider>
    );
};
