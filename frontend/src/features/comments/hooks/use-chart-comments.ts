import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth";
import type { ChartComment } from "../api";
import { fetchComments } from "../api";

/**
 * Fetches and caches the authenticated user's comments for the given chart IDs.
 * Returns a map from chart_id to comment for quick lookups.
 */
export function useChartComments(chartIds: string[]) {
    const { isAuthenticated, user } = useAuth();
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ["chart-comments", user?.id ?? null, ...chartIds.toSorted()],
        queryFn: () => fetchComments(chartIds),
        enabled: isAuthenticated && chartIds.length > 0,
        staleTime: 1000 * 60 * 5,
    });

    const commentsMap = new Map<string, ChartComment>();
    if (query.data) {
        for (const comment of query.data) {
            commentsMap.set(comment.chart_id, comment);
        }
    }

    function invalidate() {
        queryClient.invalidateQueries({ queryKey: ["chart-comments"] });
    }

    return { commentsMap, isLoading: query.isPending, invalidate };
}
