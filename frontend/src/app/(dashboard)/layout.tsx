'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/app-sidebar';
import { useStore } from '@/store/useStore';
import api from '@/lib/axios';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, setUser, isSidebarCollapsed } = useStore();
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            if (!user) {
                try {
                    const { data } = await api.get('/auth/me');
                    setUser(data.user);
                } catch (error) {
                    router.push('/login');
                }
            }
        };
        checkAuth();
    }, [user, router, setUser]);

    if (!user) {
        return null; // Or a loading spinner
    }

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar />
            <main
                className={`flex-1 p-4 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
                    }`}
            >
                {children}
            </main>
        </div>
    );
}
