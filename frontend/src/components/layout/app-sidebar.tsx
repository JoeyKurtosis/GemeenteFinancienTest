import { useRouter } from "@tanstack/react-router";
import { Bank, BookOpen01, CoinsStacked02, FileCheck02, Home02, MessageCircle01, Settings01, User02 } from "@untitledui/icons";
import type { NavItemType } from "@/components/application/app-navigation/config";
import { SidebarNavigationSimple } from "@/components/application/app-navigation/sidebar-navigation/sidebar-simple";
import { useAuth } from "@/features/auth";

const navItems: NavItemType[] = [
    {
        label: "Home",
        href: "/",
        icon: Home02,
    },
    {
        label: "Over ons",
        href: "/over-ons",
        icon: BookOpen01,
    },
    {
        label: "Referentiegroep",
        href: "/referentiegroep",
        icon: User02,
    },
    {
        label: "Managementoverzicht",
        href: "/managementoverzicht",
        icon: CoinsStacked02,
    },
    {
        label: "Verantwoording",
        href: "/verantwoording",
        icon: FileCheck02,
    },
    {
        label: "Trends",
        href: "/trends",
        icon: Bank,
    },
];

const instellingenNavItem: NavItemType = {
    label: "Instellingen",
    href: "/instellingen",
    icon: Settings01,
};

const supportNavItem: NavItemType = {
    label: "Support",
    href: "/support",
    icon: MessageCircle01,
};

export function AppSidebar() {
    const router = useRouter();
    const pathname = router.state.location.pathname;
    const { isAuthenticated, isAdmin } = useAuth();

    const items = [...navItems, ...(isAdmin ? [instellingenNavItem] : []), ...(isAuthenticated ? [supportNavItem] : [])];

    return <SidebarNavigationSimple activeUrl={pathname} items={items} showAccountCard />;
}
