import { StrictMode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";
import "@/styles/globals.css";
import { router } from "./router";

/**
 * The dashboard reads one dataset, and CBS republishes it about once a year — so within a
 * session nothing it fetches can go out of date. Everything below follows from that: cached
 * responses are treated as current for as long as the tab is open, and the refetching React
 * Query does by default would only ask again for what it already has.
 */
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: Infinity,
            gcTime: 1000 * 60 * 60,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: 1,
        },
    },
});

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>
    </StrictMode>,
);
