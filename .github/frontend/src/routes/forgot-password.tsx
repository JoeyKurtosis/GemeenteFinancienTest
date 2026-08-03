import { createFileRoute } from "@tanstack/react-router";
import { ForgotPasswordRouteView } from "@/features/auth";

export const Route = createFileRoute("/forgot-password")({
    component: ForgotPasswordRouteView,
});
