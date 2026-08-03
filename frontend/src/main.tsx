import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import "@/styles/globals.css";

/**
 * The dashboard reads one dataset, and CBS republishes it about once a year — so within a
 * session nothing it fetches can go out of date. Everything below follows from that: cached
 * responses are treated as current for as long as the tab is open, and the refetching React
 * Query does by default would only ask again for what it already has.
 *
 * The pages are not cheap to answer either — each one is the whole page in a single response,
 * built by walking every gemeente across ten years — so this is the difference between moving
 * between the Lasten tabs instantly and waiting on the server for each of them again.
 */
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: Infinity,
            gcTime: 1000 * 60 * 60, // Keep a page's data for an hour after nothing renders it.
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
