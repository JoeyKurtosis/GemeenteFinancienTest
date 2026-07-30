import { toast } from "sonner";
import { IconNotification } from "@/components/application/notifications/notifications";

export function showToast(color: "success" | "error", title: string, description: string) {
    toast.custom((id) => (
        <IconNotification title={title} description={description} color={color} hideDismissLabel onClose={() => toast.dismiss(id)} />
    ));
}
