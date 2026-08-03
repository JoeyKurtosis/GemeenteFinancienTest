import { Avatar } from "@/components/base/avatar/avatar";
import { useAuth } from "@/features/auth";

export function AccountHeader() {
    const { user } = useAuth();

    const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "";
    const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join("").toUpperCase() || fullName?.[0]?.toUpperCase() || undefined;

    return (
        <>
            {/* Header — brand cover banner with overlapping avatar */}
            <div className="h-40 w-full rounded-2xl bg-brand-500 sm:h-48" />

            <div className="-mt-12 flex flex-col gap-4 px-2 sm:-mt-5 sm:flex-row sm:items-center sm:gap-5 sm:px-6">
                <Avatar size="2xl" initials={initials} alt={fullName} className="size-24 sm:size-28" />
                <div className="flex flex-col gap-0.5">
                    <h1 className="text-display-xs font-semibold text-primary">{fullName || "Account"}</h1>
                    <p className="text-md text-tertiary">{user?.email}</p>
                </div>
            </div>
        </>
    );
}
