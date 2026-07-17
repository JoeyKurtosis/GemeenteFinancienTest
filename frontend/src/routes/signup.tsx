import { createFileRoute } from "@tanstack/react-router";
import { SignupRouteView } from "@/features/auth";

export const Route = createFileRoute("/signup")({
    component: SignupRouteView,
});
