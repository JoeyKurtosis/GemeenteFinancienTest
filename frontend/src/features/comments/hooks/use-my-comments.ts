import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth";
import { fetchAllComments } from "../api";

/**
 * Every comment the authenticated user has written, for the overview on the account page.
 *
 * Keyed under the same `["chart-comments"]` prefix the chart cards use, so saving or deleting a
 * comment on a chart — which invalidates that whole prefix — refreshes this list too.
 */
export function useMyComments() {
    const { isAuthenticated, user } = useAuth();

    const query = useQuery({
        queryKey: ["chart-comments", user?.id ?? null, "all"],
        queryFn: fetchAllComments,
        enabled: isAuthenticated,
        staleTime: 1000 * 60 * 5,
    });

    return { comments: query.data ?? [], isLoading: query.isPending, error: query.error };
}
