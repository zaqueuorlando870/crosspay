import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { BookOpen, Folder, LayoutGrid, Wallet, ArrowDownUp, Wallet2, ArrowUpCircle, Globe } from 'lucide-react';
import AppLogo from './app-logo';
import { BsCurrencyExchange } from 'react-icons/bs';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Fund Wallet',
        href: '/wallet/deposit',
        icon: Wallet,
    },
    {
        title: 'Selling Currency',
        href: '/selling',
        icon: ArrowDownUp,
    },
    {
        title: 'Earnings',
        href: '/earnings/overview',
        icon: ArrowUpCircle, // Replace with suitable icon
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Open Marketplace',
        href: '/marketplace',
        icon: Globe,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <BsCurrencyExchange className="text-white text-xl" /> CrossPay
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
