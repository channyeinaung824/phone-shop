'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Package, ShoppingCart, Settings, LogOut, Smartphone, ChevronDown, ChevronRight, List, Menu, Truck, UserCheck, ClipboardList, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import api from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { ModeToggle } from '@/components/mode-toggle';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const sidebarItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/users', label: 'Users', icon: Users, roles: ['ADMIN'] },
    {
        label: 'Products',
        icon: Package,
        children: [
            { href: '/products', label: 'Product List', icon: Package },
            { href: '/categories', label: 'Category List', icon: List },
            { href: '/imeis', label: 'IMEI List', icon: Smartphone },
        ]
    },
    { href: '/suppliers', label: 'Suppliers', icon: Truck },
    { href: '/customers', label: 'Customers', icon: UserCheck },
    { href: '/purchases', label: 'Purchases', icon: ClipboardList },
    { href: '/sales', label: 'Sales', icon: ShoppingCart },
    { href: '/expenses', label: 'Expenses', icon: Receipt },
    { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const { user, logout, isSidebarCollapsed, toggleSidebar } = useStore();
    const [openItems, setOpenItems] = useState<string[]>(['Products']); // Default open Products

    const toggleItem = (label: string) => {
        if (isSidebarCollapsed) return;
        setOpenItems(prev =>
            prev.includes(label)
                ? prev.filter(item => item !== label)
                : [...prev, label]
        );
    };

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
            logout();
            router.push('/login');
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    return (
        <aside
            className={cn(
                "fixed inset-y-0 left-0 z-50 p-4 hidden md:block transition-all duration-300",
                isSidebarCollapsed ? "w-20" : "w-64"
            )}
        >
            <div className="flex h-full flex-col rounded-2xl bg-white shadow-xl dark:bg-[#202940] transition-colors duration-300">

                {/* Header */}
                <div className={cn(
                    "flex h-20 items-center px-4 border-b border-gray-100 dark:border-white/10",
                    isSidebarCollapsed ? "justify-center" : "justify-between"
                )}>
                    {!isSidebarCollapsed && (
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white shadow-md dark:bg-white dark:text-gray-900">
                                <Smartphone className="h-4 w-4" />
                            </div>
                            <h1 className="text-sm font-bold tracking-wide uppercase text-gray-800 dark:text-white">Phone Shop</h1>
                        </div>
                    )}
                    <Button variant="ghost" size="icon" onClick={toggleSidebar} className={cn(isSidebarCollapsed && "h-10 w-10")}>
                        <Menu className="h-5 w-5" />
                    </Button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto overflow-x-hidden">
                    {sidebarItems.map((item) => {
                        if (item.roles && user && !item.roles.includes(user.role)) return null;

                        const Icon = item.icon;
                        const isActive = item.href ? pathname === item.href : false; // Naive check for single items
                        // Check active for parents: if any child matches pathname
                        const isParentActive = item.children?.some(child => pathname === child.href);

                        const hasChildren = item.children && item.children.length > 0;
                        const isOpen = openItems.includes(item.label);

                        // COLLAPSED STATE
                        if (isSidebarCollapsed) {
                            if (hasChildren) {
                                return (
                                    <DropdownMenu key={item.label}>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                className={cn(
                                                    "w-full justify-center h-12 p-0 rounded-lg transition-all duration-200",
                                                    isParentActive
                                                        ? "bg-gray-900 text-white dark:bg-primary dark:text-primary-foreground"
                                                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                                                )}
                                                title={item.label}
                                            >
                                                <Icon className="h-5 w-5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent side="right" className="w-56" align="start">
                                            <DropdownMenuLabel>{item.label}</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {item.children?.map((child) => (
                                                <DropdownMenuItem key={child.href} asChild>
                                                    <Link href={child.href} className="flex items-center cursor-pointer">
                                                        <child.icon className="mr-2 h-4 w-4" />
                                                        <span>{child.label}</span>
                                                    </Link>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                );
                            } else {
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href!}
                                        title={item.label}
                                        className={cn(
                                            'group flex items-center justify-center rounded-lg h-12 w-full transition-all duration-200',
                                            isActive
                                                ? 'bg-gray-900 text-white shadow-md shadow-gray-900/20 dark:bg-primary dark:text-primary-foreground'
                                                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white'
                                        )}
                                    >
                                        <Icon className="h-5 w-5" />
                                    </Link>
                                );
                            }
                        }

                        // EXPANDED STATE (Original logic mostly)
                        if (hasChildren) {
                            return (
                                <div key={item.label} className="space-y-1">
                                    <button
                                        onClick={() => toggleItem(item.label)}
                                        className={cn(
                                            'w-full group flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white',
                                            isParentActive && 'bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white'
                                        )}
                                    >
                                        <div className="flex items-center">
                                            <Icon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
                                            {item.label}
                                        </div>
                                        {isOpen ? (
                                            <ChevronDown className="h-4 w-4 text-gray-400" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4 text-gray-400" />
                                        )}
                                    </button>

                                    {/* Children */}
                                    {isOpen && (
                                        <div className="ml-4 space-y-1 border-l border-gray-200 pl-2 dark:border-gray-700">
                                            {item.children?.map((child) => {
                                                const ChildIcon = child.icon;
                                                const isChildActive = pathname === child.href;
                                                return (
                                                    <Link
                                                        key={child.href}
                                                        href={child.href}
                                                        className={cn(
                                                            'group flex items-center rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                                                            isChildActive
                                                                ? 'bg-gray-900 text-white shadow-md shadow-gray-900/20 dark:bg-primary dark:text-primary-foreground'
                                                                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'
                                                        )}
                                                    >
                                                        <ChildIcon className={cn("mr-3 h-4 w-4", isChildActive ? "text-white dark:text-primary-foreground" : "text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white")} />
                                                        {child.label}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        // Standard Item
                        return (
                            <Link
                                key={item.href}
                                href={item.href!}
                                className={cn(
                                    'group flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200',
                                    isActive
                                        ? 'bg-gray-900 text-white shadow-md shadow-gray-900/20 dark:bg-primary dark:text-primary-foreground'
                                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white'
                                )}
                            >
                                <Icon className={cn("mr-3 h-5 w-5", isActive ? "text-white dark:text-primary-foreground" : "text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white")} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer Actions */}
                <div className="mt-auto p-3 space-y-4">
                    {!isSidebarCollapsed && (
                        <div className="flex items-center justify-between px-2">
                            <span className="text-xs text-gray-400">Theme</span>
                            <ModeToggle />
                        </div>
                    )}

                    {/* Collapsed Theme Toggle - optional if space permits, or just hide */}
                    {isSidebarCollapsed && (
                        <div className="flex justify-center">
                            <ModeToggle />
                        </div>
                    )}

                    <div className={cn("rounded-xl border border-gray-100 p-3 dark:border-white/10 dark:bg-white/5", isSidebarCollapsed && "p-2 border-0 bg-transparent")}>
                        <div className={cn("flex items-center gap-3", isSidebarCollapsed && "justify-center")}>
                            <div className="h-8 w-8 min-w-[2rem] rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-700 dark:bg-white/20 dark:text-white">
                                {user?.name?.[0] || 'U'}
                            </div>
                            {!isSidebarCollapsed && (
                                <div className="overflow-hidden">
                                    <p className="truncate text-xs font-medium text-gray-900 dark:text-white">{user?.name}</p>
                                    <p className="truncate text-[10px] text-gray-500 dark:text-gray-400 capitalize">{user?.role?.toLowerCase()}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        className={cn(
                            "w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 rounded-lg",
                            isSidebarCollapsed && "justify-center px-0"
                        )}
                        onClick={handleLogout}
                        title="Sign Out"
                    >
                        <LogOut className={cn("h-4 w-4", !isSidebarCollapsed && "mr-3")} />
                        {!isSidebarCollapsed && "Sign Out"}
                    </Button>
                </div>
            </div>
        </aside>
    );
}
