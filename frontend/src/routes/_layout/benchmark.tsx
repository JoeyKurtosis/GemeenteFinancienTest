import { createFileRoute } from "@tanstack/react-router";
import { UitlegSubContent } from "@/components/layout/uitleg-sub-content";
import { benchmarkUitleg, BenchmarkRouteView } from "@/features/benchmark";

export const Route = createFileRoute("/_layout/benchmark")({
    component: BenchmarkRouteView,
    context: () => ({
        title: "Benchmark",
        description: "Personele lasten",
        showBreadCrumbs: true,
        subContent: <UitlegSubContent paragraphs={benchmarkUitleg} />,
    }),
});
