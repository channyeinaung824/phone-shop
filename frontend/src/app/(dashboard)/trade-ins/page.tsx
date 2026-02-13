'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, ChevronLeft, ChevronRight, ArrowRightLeft } from 'lucide-react';
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
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    RESOLD: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

const CONDITION_OPTIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'For Parts'];

const schema = z.object({
    customerId: z.string().optional(),
    deviceName: z.string().min(1, 'Device name required'),
    condition: z.string().min(1, 'Condition required'),
    offeredPrice: z.coerce.number().positive('Price required'),
    note: z.string().optional(),
});

export default function TradeInsPage() {
    const [tradeIns, setTradeIns] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

    const fetchTradeIns = async (p = page) => {
        try {
            let url = `/trade-ins?q=${search}&page=${p}&limit=${limit}`;
            if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
            const res = await api.get(url);
            setTradeIns(res.data.data);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { api.get('/customers?limit=200').then(r => setCustomers(r.data.data || [])).catch(() => { }); }, []);
    useEffect(() => { setPage(1); const t = setTimeout(() => fetchTradeIns(1), 500); return () => clearTimeout(t); }, [search, statusFilter]);
    useEffect(() => { fetchTradeIns(page); }, [page]);

    const onSubmit = async (values: z.infer<typeof schema>) => {
        try {
            await api.post('/trade-ins', {
                customerId: values.customerId ? parseInt(values.customerId) : undefined,
                deviceName: values.deviceName,
                condition: values.condition,
                offeredPrice: values.offeredPrice,
                note: values.note,
            });
            toast.success('Trade-in recorded');
            setDialogOpen(false);
            form.reset();
            fetchTradeIns();
        } catch (error: any) { toast.error(error.response?.data?.message || 'Failed'); }
    };

    const updateStatus = async (id: number, status: string) => {
        try {
            await api.put(`/trade-ins/${id}`, { status });
            toast.success(`Status → ${status}`);
            fetchTradeIns();
        } catch (error: any) { toast.error(error.response?.data?.message || 'Failed'); }
    };

    return (
        <div className="mt-6 mb-4 flex flex-col gap-6">
            <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                <div className="relative mx-4 -mt-6 overflow-hidden rounded-xl bg-gradient-to-tr from-cyan-700 to-cyan-500 bg-clip-border p-6 text-white shadow-lg shadow-cyan-500/20 flex items-center justify-between">
                    <div>
                        <h6 className="text-xl font-bold">Trade-Ins</h6>
                        <p className="text-sm text-cyan-100 opacity-80">Manage used device trade-ins</p>
                    </div>
                    <Button onClick={() => { form.reset(); setDialogOpen(true); }} className="bg-white text-cyan-700 hover:bg-white/90">
                        <Plus className="mr-2 h-4 w-4" /> New Trade-In
                    </Button>
                </div>

                <div className="px-0 overflow-x-auto">
                    <div className="px-4 py-3 flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input placeholder="Search device/customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 bg-gray-50 dark:bg-gray-900/50" />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-10 w-[130px] text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Status</SelectItem>
                                {Object.keys(STATUS_MAP).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="max-h-[calc(100vh-380px)] overflow-y-auto">
                        <Table className="w-full min-w-[800px] text-left text-sm">
                            <TableHeader className="sticky top-0 z-10 bg-white dark:bg-[#202940]">
                                <TableRow className="border-b border-gray-100 dark:border-white/10">
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Device</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Customer</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Condition</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Offered Price</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Status</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Date</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tradeIns.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} className="py-6 text-center text-gray-500">No trade-ins found.</TableCell></TableRow>
                                ) : tradeIns.map((t) => (
                                    <TableRow key={t.id} className="border-b border-gray-100 dark:border-white/10 hover:bg-gray-50/50 dark:hover:bg-white/5">
                                        <TableCell className="px-4 py-2 font-semibold">{t.deviceName}</TableCell>
                                        <TableCell className="px-4 py-2 text-sm">{t.customer?.name || '-'}</TableCell>
                                        <TableCell className="px-4 py-2">
                                            <Badge variant="outline" className="text-xs">{t.condition}</Badge>
                                        </TableCell>
                                        <TableCell className="px-4 py-2 font-bold text-cyan-600">{formatPrice(t.offeredPrice)}</TableCell>
                                        <TableCell className="px-4 py-2">
                                            <Badge variant="secondary" className={`text-xs border-0 ${STATUS_MAP[t.status]}`}>{t.status}</Badge>
                                        </TableCell>
                                        <TableCell className="px-4 py-2 text-xs text-gray-500">{format(new Date(t.createdAt), 'dd MMM yyyy')}</TableCell>
                                        <TableCell className="px-4 py-2 text-right">
                                            {t.status === 'PENDING' && (
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-green-600" onClick={() => updateStatus(t.id, 'ACCEPTED')}>Accept</Button>
                                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600" onClick={() => updateStatus(t.id, 'REJECTED')}>Reject</Button>
                                                </div>
                                            )}
                                            {t.status === 'ACCEPTED' && (
                                                <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600" onClick={() => updateStatus(t.id, 'RESOLD')}>Mark Resold</Button>
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
                        <div className="relative mx-4 -mt-6 mb-4 grid h-20 place-items-center rounded-xl bg-gradient-to-tr from-cyan-700 to-cyan-500 shadow-lg shadow-cyan-500/20">
                            <DialogTitle className="text-xl font-semibold text-white">New Trade-In</DialogTitle>
                        </div>
                        <div className="px-6 pb-6 pt-2">
                            <DialogDescription className="sr-only">Create trade-in</DialogDescription>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
                                    <FormField control={form.control} name="customerId" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Customer</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select customer (optional)" /></SelectTrigger></FormControl>
                                                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="deviceName" render={({ field }) => (
                                        <FormItem><FormLabel>Device Name *</FormLabel><FormControl><Input className="h-10" placeholder="e.g. Samsung Galaxy S24 Ultra" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <div className="grid grid-cols-2 gap-3">
                                        <FormField control={form.control} name="condition" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Condition *</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                                    <SelectContent>{CONDITION_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                                </Select><FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="offeredPrice" render={({ field }) => (
                                            <FormItem><FormLabel>Offered Price *</FormLabel><FormControl><Input type="number" className="h-10" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                    <FormField control={form.control} name="note" render={({ field }) => (
                                        <FormItem><FormLabel>Note</FormLabel><FormControl><Textarea rows={2} className="resize-none" {...field} /></FormControl></FormItem>
                                    )} />
                                    <Button type="submit" disabled={form.formState.isSubmitting} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-10 text-xs font-bold uppercase mt-2">
                                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Record Trade-In
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
