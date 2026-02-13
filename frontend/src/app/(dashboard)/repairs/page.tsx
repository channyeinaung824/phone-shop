'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, ChevronLeft, ChevronRight, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';

const formatPrice = (n: number | string) => Number(n).toLocaleString('en-US');

const STATUS_MAP: Record<string, string> = {
    RECEIVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    DIAGNOSING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    WAITING_PARTS: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    REPAIRING: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    DELIVERED: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
    CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_FLOW = ['RECEIVED', 'DIAGNOSING', 'WAITING_PARTS', 'REPAIRING', 'COMPLETED', 'DELIVERED'];

const schema = z.object({
    customerId: z.string().min(1, 'Customer required'),
    deviceInfo: z.string().min(1, 'Device info required'),
    issue: z.string().min(1, 'Issue required'),
    diagnosis: z.string().optional(),
    repairCost: z.coerce.number().min(0).optional(),
});

export default function RepairOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

    const fetchOrders = async (p = page) => {
        try {
            let url = `/repairs?q=${search}&page=${p}&limit=${limit}`;
            if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
            const res = await api.get(url);
            setOrders(res.data.data);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { api.get('/customers?limit=200').then(r => setCustomers(r.data.data || [])).catch(() => { }); }, []);
    useEffect(() => { setPage(1); const t = setTimeout(() => fetchOrders(1), 500); return () => clearTimeout(t); }, [search, statusFilter]);
    useEffect(() => { fetchOrders(page); }, [page]);

    const onSubmit = async (values: z.infer<typeof schema>) => {
        try {
            await api.post('/repairs', {
                customerId: parseInt(values.customerId),
                deviceInfo: values.deviceInfo,
                issue: values.issue,
                diagnosis: values.diagnosis,
                repairCost: values.repairCost,
            });
            toast.success('Repair order created');
            setDialogOpen(false);
            form.reset();
            fetchOrders();
        } catch (error: any) { toast.error(error.response?.data?.message || 'Failed'); }
    };

    const updateStatus = async (id: number, status: string) => {
        try {
            await api.put(`/repairs/${id}`, { status });
            toast.success(`Status → ${status}`);
            fetchOrders();
        } catch (error: any) { toast.error(error.response?.data?.message || 'Failed'); }
    };

    const nextStatus = (current: string) => {
        const idx = STATUS_FLOW.indexOf(current);
        return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
    };

    return (
        <div className="mt-6 mb-4 flex flex-col gap-6">
            <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                <div className="relative mx-4 -mt-6 overflow-hidden rounded-xl bg-gradient-to-tr from-purple-700 to-purple-500 bg-clip-border p-6 text-white shadow-lg shadow-purple-500/20 flex items-center justify-between">
                    <div>
                        <h6 className="text-xl font-bold">Repair Orders</h6>
                        <p className="text-sm text-purple-100 opacity-80">Manage device repair tickets</p>
                    </div>
                    <Button onClick={() => { form.reset(); setDialogOpen(true); }} className="bg-white text-purple-700 hover:bg-white/90">
                        <Plus className="mr-2 h-4 w-4" /> New Repair
                    </Button>
                </div>

                <div className="px-0 overflow-x-auto">
                    <div className="px-4 py-3 flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input placeholder="Search ticket/customer/device..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 bg-gray-50 dark:bg-gray-900/50" />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-10 w-[150px] text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Status</SelectItem>
                                {Object.keys(STATUS_MAP).map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="max-h-[calc(100vh-380px)] overflow-y-auto">
                        <Table className="w-full min-w-[900px] text-left text-sm">
                            <TableHeader className="sticky top-0 z-10 bg-white dark:bg-[#202940]">
                                <TableRow className="border-b border-gray-100 dark:border-white/10">
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Ticket</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Customer</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Device</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Issue</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Cost</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Status</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Date</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.length === 0 ? (
                                    <TableRow><TableCell colSpan={8} className="py-6 text-center text-gray-500">No repair orders found.</TableCell></TableRow>
                                ) : orders.map((o) => (
                                    <TableRow key={o.id} className="border-b border-gray-100 dark:border-white/10 hover:bg-gray-50/50 dark:hover:bg-white/5">
                                        <TableCell className="px-4 py-2 font-mono text-xs font-bold text-purple-600">{o.ticketNo}</TableCell>
                                        <TableCell className="px-4 py-2 font-semibold">{o.customer?.name}</TableCell>
                                        <TableCell className="px-4 py-2 text-sm">{o.deviceInfo}</TableCell>
                                        <TableCell className="px-4 py-2 text-xs text-gray-500 max-w-[200px] truncate">{o.issue}</TableCell>
                                        <TableCell className="px-4 py-2 font-bold">{formatPrice(o.repairCost)}</TableCell>
                                        <TableCell className="px-4 py-2">
                                            <Badge variant="secondary" className={`text-xs border-0 ${STATUS_MAP[o.status]}`}>{o.status.replace('_', ' ')}</Badge>
                                        </TableCell>
                                        <TableCell className="px-4 py-2 text-xs text-gray-500">{format(new Date(o.receivedAt), 'dd MMM')}</TableCell>
                                        <TableCell className="px-4 py-2 text-right">
                                            {nextStatus(o.status) && (
                                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => updateStatus(o.id, nextStatus(o.status)!)}>
                                                    → {nextStatus(o.status)!.replace('_', ' ')}
                                                </Button>
                                            )}
                                            {o.status !== 'CANCELLED' && o.status !== 'DELIVERED' && (
                                                <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600" onClick={() => updateStatus(o.id, 'CANCELLED')}>
                                                    Cancel
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

            {/* Create Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 overflow-visible border-none shadow-none bg-transparent">
                    <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                        <div className="relative mx-4 -mt-6 mb-4 grid h-20 place-items-center rounded-xl bg-gradient-to-tr from-purple-700 to-purple-500 shadow-lg shadow-purple-500/20">
                            <DialogTitle className="text-xl font-semibold text-white">New Repair Order</DialogTitle>
                        </div>
                        <div className="px-6 pb-6 pt-2">
                            <DialogDescription className="sr-only">Create repair order</DialogDescription>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
                                    <FormField control={form.control} name="customerId" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Customer *</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select customer" /></SelectTrigger></FormControl>
                                                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name} ({c.phone})</SelectItem>)}</SelectContent>
                                            </Select><FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="deviceInfo" render={({ field }) => (
                                        <FormItem><FormLabel>Device Info *</FormLabel><FormControl><Input className="h-10" placeholder="e.g. iPhone 15 Pro Max 256GB" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="issue" render={({ field }) => (
                                        <FormItem><FormLabel>Issue *</FormLabel><FormControl><Textarea rows={2} className="resize-none" placeholder="Describe the issue..." {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="repairCost" render={({ field }) => (
                                        <FormItem><FormLabel>Estimated Cost</FormLabel><FormControl><Input type="number" className="h-10" placeholder="0" {...field} /></FormControl></FormItem>
                                    )} />
                                    <Button type="submit" disabled={form.formState.isSubmitting} className="w-full bg-purple-600 hover:bg-purple-700 text-white h-10 text-xs font-bold uppercase mt-2">
                                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Create Order
                                    </Button>
                                </form>
                            </Form>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
