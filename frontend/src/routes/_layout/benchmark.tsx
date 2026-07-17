import { createFileRoute } from "@tanstack/react-router";
import { BenchmarkRouteView } from "@/features/benchmark";

export const Route = createFileRoute("/_layout/benchmark")({
    component: BenchmarkRouteView,
    context: () => ({
        title: "Benchmark",
        description: "Personele lasten",
        showBreadCrumbs: true,
    }),
});
