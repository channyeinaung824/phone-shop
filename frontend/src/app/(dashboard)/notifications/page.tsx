'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell, Check, CheckCheck, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/axios';

const TYPE_ICONS: Record<string, string> = {
    INFO: '💬',
    WARNING: '⚠️',
    SUCCESS: '✅',
    ERROR: '❌',
    SYSTEM: '🔔',
};

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showUnreadOnly, setShowUnreadOnly] = useState(false);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const fetchNotifications = useCallback(async (p = page) => {
        try {
            let url = `/notifications?page=${p}&limit=${limit}`;
            if (showUnreadOnly) url += '&unreadOnly=true';
            const res = await api.get(url);
            setNotifications(res.data.data);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
            setUnreadCount(res.data.unreadCount);
        } catch (e) { console.error(e); }
    }, [page, limit, showUnreadOnly]);

    useEffect(() => { setPage(1); fetchNotifications(1); }, [showUnreadOnly]);
    useEffect(() => { fetchNotifications(page); }, [page]);

    const markAsRead = async (id: number) => {
        try {
            await api.put(`/notifications/${id}/read`);
            fetchNotifications();
        } catch (e) { console.error(e); }
    };

    const markAllAsRead = async () => {
        try {
            await api.put('/notifications/read-all');
            toast.success('All marked as read');
            fetchNotifications();
        } catch (e) { console.error(e); }
    };

    const deleteNotification = async (id: number) => {
        try {
            await api.delete(`/notifications/${id}`);
            toast.success('Deleted');
            fetchNotifications();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="mt-6 mb-4 flex flex-col gap-6">
            <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                <div className="relative mx-4 -mt-6 overflow-hidden rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 bg-clip-border p-6 text-white shadow-lg shadow-indigo-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Bell className="h-6 w-6" />
                        <div>
                            <h6 className="text-xl font-bold">Notifications</h6>
                            <p className="text-sm text-indigo-100 opacity-80">{unreadCount} unread</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => setShowUnreadOnly(!showUnreadOnly)} variant="secondary" size="sm" className={`text-xs ${showUnreadOnly ? 'bg-white text-indigo-700' : 'bg-white/20 text-white hover:bg-white/30'}`}>
                            {showUnreadOnly ? 'Show All' : 'Unread Only'}
                        </Button>
                        {unreadCount > 0 && (
                            <Button onClick={markAllAsRead} className="bg-white text-indigo-700 hover:bg-white/90 text-xs">
                                <CheckCheck className="mr-1 h-3.5 w-3.5" /> Mark All Read
                            </Button>
                        )}
                    </div>
                </div>

                <div className="p-4">
                    {notifications.length === 0 ? (
                        <div className="py-12 text-center text-gray-400">
                            <Bell className="mx-auto h-12 w-12 mb-3 opacity-30" />
                            <p>No notifications</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {notifications.map((n) => (
                                <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${n.isRead ? 'bg-gray-50/50 dark:bg-gray-800/30' : 'bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-200/50 dark:border-indigo-700/30'}`}>
                                    <span className="text-lg mt-0.5">{TYPE_ICONS[n.type] || '🔔'}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className={`text-sm font-semibold ${n.isRead ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>{n.title}</p>
                                            {!n.isRead && <Badge className="bg-indigo-500 text-white text-[10px] px-1.5 py-0">NEW</Badge>}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                                        <p className="text-xs text-gray-400 mt-1">{format(new Date(n.createdAt), 'dd MMM yyyy HH:mm')}</p>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        {!n.isRead && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-600" onClick={() => markAsRead(n.id)}>
                                                <Check className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteNotification(n.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t mt-4 pt-3">
                            <p className="text-xs text-gray-500">Page {page} of {totalPages} ({total} total)</p>
                            <div className="flex gap-1">
                                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
