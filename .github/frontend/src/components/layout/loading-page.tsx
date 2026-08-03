import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";

export function LoadingPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-primary">
            <LoadingIndicator size="md" label="Laden..." />
        </div>
    );
}
