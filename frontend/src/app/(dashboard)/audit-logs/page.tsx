'use client';

import { useEffect, useState } from 'react';
import { Search, ChevronLeft, ChevronRight, FileText, Filter } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import api from '@/lib/axios';

const ACTION_COLORS: Record<string, string> = {
    CREATE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    VOID: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    REFUND: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    LOGIN: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
};

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [entities, setEntities] = useState<string[]>([]);
    const [actions, setActions] = useState<string[]>([]);
    const [entityFilter, setEntityFilter] = useState('ALL');
    const [actionFilter, setActionFilter] = useState('ALL');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState<any>(null);

    const fetchLogs = async (p = page) => {
        try {
            let url = `/audit-logs?q=${search}&page=${p}&limit=${limit}`;
            if (entityFilter !== 'ALL') url += `&entity=${entityFilter}`;
            if (actionFilter !== 'ALL') url += `&action=${actionFilter}`;
            if (from) url += `&from=${from}`;
            if (to) url += `&to=${to}`;
            const res = await api.get(url);
            setLogs(res.data.data);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        api.get('/audit-logs/filters').then(r => { setEntities(r.data.entities || []); setActions(r.data.actions || []); }).catch(() => { });
    }, []);

    useEffect(() => { setPage(1); const t = setTimeout(() => fetchLogs(1), 500); return () => clearTimeout(t); }, [search, entityFilter, actionFilter, from, to]);
    useEffect(() => { fetchLogs(page); }, [page]);

    return (
        <div className="mt-6 mb-4 flex flex-col gap-6">
            <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                <div className="relative mx-4 -mt-6 overflow-hidden rounded-xl bg-gradient-to-tr from-slate-800 to-slate-600 bg-clip-border p-6 text-white shadow-lg shadow-slate-500/20 flex items-center justify-between">
                    <div>
                        <h6 className="text-xl font-bold">Audit Logs</h6>
                        <p className="text-sm text-slate-200 opacity-80">Track all system activities</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                        <FileText className="h-5 w-5" /> {total} records
                    </div>
                </div>

                <div className="px-0 overflow-x-auto">
                    <div className="px-4 py-3 flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input placeholder="Search user/entity..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 bg-gray-50 dark:bg-gray-900/50" />
                        </div>
                        <Select value={entityFilter} onValueChange={setEntityFilter}>
                            <SelectTrigger className="h-10 w-[130px] text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Entities</SelectItem>
                                {entities.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={actionFilter} onValueChange={setActionFilter}>
                            <SelectTrigger className="h-10 w-[120px] text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Actions</SelectItem>
                                {actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 w-[140px] text-sm" placeholder="From" />
                        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 w-[140px] text-sm" placeholder="To" />
                    </div>

                    <div className="max-h-[calc(100vh-380px)] overflow-y-auto">
                        <Table className="w-full min-w-[900px] text-left text-sm">
                            <TableHeader className="sticky top-0 z-10 bg-white dark:bg-[#202940]">
                                <TableRow className="border-b border-gray-100 dark:border-white/10">
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Time</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">User</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Action</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Entity</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Entity ID</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">IP</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 text-right">Detail</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} className="py-6 text-center text-gray-500">No audit logs found.</TableCell></TableRow>
                                ) : logs.map((log) => (
                                    <TableRow key={log.id} className="border-b border-gray-100 dark:border-white/10 hover:bg-gray-50/50 dark:hover:bg-white/5">
                                        <TableCell className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">{format(new Date(log.createdAt), 'dd MMM HH:mm:ss')}</TableCell>
                                        <TableCell className="px-4 py-2 font-semibold text-sm">{log.user?.name || 'System'}</TableCell>
                                        <TableCell className="px-4 py-2">
                                            <Badge variant="secondary" className={`text-xs border-0 ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800'}`}>{log.action}</Badge>
                                        </TableCell>
                                        <TableCell className="px-4 py-2 text-sm font-mono">{log.entity}</TableCell>
                                        <TableCell className="px-4 py-2 text-sm text-gray-500">#{log.entityId || '-'}</TableCell>
                                        <TableCell className="px-4 py-2 text-xs text-gray-400 font-mono">{log.ipAddress || '-'}</TableCell>
                                        <TableCell className="px-4 py-2 text-right">
                                            {(log.oldData || log.newData) && (
                                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setSelectedLog(log); setDetailOpen(true); }}>
                                                    View Data
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {totalPages > 0 && (
                        <div className="flex items-center justify-between border-t px-4 py-3">
                            <p className="text-xs text-gray-500">Showing {total === 0 ? 0 : (page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</p>
                            <div className="flex gap-1">
                                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Dialog */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                    <DialogTitle className="text-lg font-bold">Audit Log Detail</DialogTitle>
                    <DialogDescription className="sr-only">Audit log data</DialogDescription>
                    {selectedLog && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div><span className="text-gray-500">User:</span> <strong>{selectedLog.user?.name || 'System'}</strong></div>
                                <div><span className="text-gray-500">Action:</span> <Badge variant="secondary" className={`text-xs ${ACTION_COLORS[selectedLog.action] || ''}`}>{selectedLog.action}</Badge></div>
                                <div><span className="text-gray-500">Entity:</span> <strong>{selectedLog.entity} #{selectedLog.entityId}</strong></div>
                                <div><span className="text-gray-500">Time:</span> <strong>{format(new Date(selectedLog.createdAt), 'dd MMM yyyy HH:mm:ss')}</strong></div>
                            </div>
                            {selectedLog.oldData && (
                                <div>
                                    <h4 className="text-sm font-semibold text-red-600 mb-1">Old Data</h4>
                                    <pre className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 text-xs overflow-x-auto max-h-48">{JSON.stringify(selectedLog.oldData, null, 2)}</pre>
                                </div>
                            )}
                            {selectedLog.newData && (
                                <div>
                                    <h4 className="text-sm font-semibold text-green-600 mb-1">New Data</h4>
                                    <pre className="p-3 rounded-lg bg-green-50 dark:bg-green-900/10 text-xs overflow-x-auto max-h-48">{JSON.stringify(selectedLog.newData, null, 2)}</pre>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
