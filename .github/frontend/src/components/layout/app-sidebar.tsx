import { useRouter } from "@tanstack/react-router";
import {
    Bank,
    BarChartSquare01,
    CoinsHand,
    CoinsStacked02,
    CurrencyEuroCircle,
    FileCheck02,
    Home02,
    MessageCircle01,
    Settings01,
    User02,
    Wallet02,
} from "@untitledui/icons";
import type { NavItemType } from "@/components/application/app-navigation/config";
import { SidebarNavigationSimple } from "@/components/application/app-navigation/sidebar-navigation/sidebar-simple";
import { useAuth } from "@/features/auth";

const navItems: NavItemType[] = [
    {
        label: "Dashboard",
        href: "/",
        icon: Home02,
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
        label: "Begroting",
        icon: CurrencyEuroCircle,
        href: "/begroting",
    },
    {
        label: "Lasten",
        icon: Wallet02,
        href: "/lasten",
    },
    {
        label: "Benchmark",
        href: "/benchmark",
        icon: BarChartSquare01,
    },
    {
        label: "Baten",
        icon: CoinsHand,
        href: "/baten",
    },
    {
        label: "Gemeentelijke stand",
        href: "/gemeentelijkestand",
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

    const items = [
        ...navItems,
        ...(isAdmin ? [instellingenNavItem] : []),
        ...(isAuthenticated ? [supportNavItem] : []),
    ];

    return <SidebarNavigationSimple activeUrl={pathname} items={items} showAccountCard />;
}
