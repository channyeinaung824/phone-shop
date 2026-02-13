'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, ChevronLeft, ChevronRight, DollarSign, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import api from '@/lib/axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';

const formatPrice = (n: number | string) => {
    const num = Number(n);
    return num % 1 === 0 ? num.toLocaleString('en-US', { maximumFractionDigits: 0 }) : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const STATUS_MAP: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    COMPLETED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    DEFAULTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const createSchema = z.object({
    saleId: z.coerce.number().positive('Sale required'),
    customerId: z.coerce.number().positive('Customer required'),
    totalAmount: z.coerce.number().positive(),
    downPayment: z.coerce.number().min(0),
    monthlyAmount: z.coerce.number().positive(),
    totalMonths: z.coerce.number().int().positive(),
});

const paymentSchema = z.object({
    amount: z.coerce.number().positive('Amount required'),
    note: z.string().optional(),
});

export default function InstallmentsPage() {
    const [installments, setInstallments] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [payDialogOpen, setPayDialogOpen] = useState(false);
    const [detailDialog, setDetailDialog] = useState(false);
    const [selectedInst, setSelectedInst] = useState<any>(null);
    const [detail, setDetail] = useState<any>(null);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [sales, setSales] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);

    const form = useForm<z.infer<typeof createSchema>>({ resolver: zodResolver(createSchema), defaultValues: { saleId: '' as any, customerId: '' as any, totalAmount: '' as any, downPayment: '' as any, monthlyAmount: '' as any, totalMonths: '' as any } });
    const payForm = useForm<z.infer<typeof paymentSchema>>({ resolver: zodResolver(paymentSchema), defaultValues: { amount: '' as any, note: '' } });

    const fetchInstallments = async (p = page) => {
        try {
            let url = `/installments?q=${search}&page=${p}&limit=${limit}`;
            if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
            const res = await api.get(url);
            setInstallments(res.data.data);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
        } catch (e) { console.error(e); }
    };

    const fetchDetail = async (id: number) => {
        try {
            const res = await api.get(`/installments/${id}`);
            setDetail(res.data);
            setDetailDialog(true);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        api.get('/sales?limit=200').then(r => setSales(r.data.data || [])).catch(() => { });
        api.get('/customers?limit=200').then(r => setCustomers(r.data.data || [])).catch(() => { });
    }, []);

    useEffect(() => { setPage(1); const t = setTimeout(() => fetchInstallments(1), 500); return () => clearTimeout(t); }, [search, statusFilter]);
    useEffect(() => { fetchInstallments(page); }, [page]);

    const onSubmit = async (values: z.infer<typeof createSchema>) => {
        try {
            await api.post('/installments', values);
            toast.success('Installment created');
            setDialogOpen(false);
            form.reset();
            fetchInstallments();
        } catch (error: any) { toast.error(error.response?.data?.message || 'Failed'); }
    };

    const onPay = async (values: z.infer<typeof paymentSchema>) => {
        if (!selectedInst) return;
        try {
            await api.post(`/installments/${selectedInst.id}/payments`, values);
            toast.success('Payment recorded');
            setPayDialogOpen(false);
            payForm.reset();
            fetchInstallments();
            if (detail?.id === selectedInst.id) fetchDetail(selectedInst.id);
        } catch (error: any) { toast.error(error.response?.data?.message || 'Failed'); }
    };

    return (
        <div className="mt-6 mb-4 flex flex-col gap-6">
            <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                <div className="relative mx-4 -mt-6 overflow-hidden rounded-xl bg-gradient-to-tr from-amber-700 to-amber-500 bg-clip-border p-6 text-white shadow-lg shadow-amber-500/20 flex items-center justify-between">
                    <div>
                        <h6 className="text-xl font-bold">Installments</h6>
                        <p className="text-sm text-amber-100 opacity-80">Track installment payments</p>
                    </div>
                    <Button onClick={() => { form.reset(); setDialogOpen(true); }} className="bg-white text-amber-700 hover:bg-white/90">
                        <Plus className="mr-2 h-4 w-4" /> New Installment
                    </Button>
                </div>

                <div className="px-0 overflow-x-auto">
                    <div className="px-4 py-3 flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input placeholder="Search customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 bg-gray-50 dark:bg-gray-900/50" />
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
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Customer</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Invoice</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Total</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Down</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Remaining</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Monthly</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Status</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {installments.length === 0 ? (
                                    <TableRow><TableCell colSpan={8} className="py-6 text-center text-gray-500">No installments found.</TableCell></TableRow>
                                ) : installments.map((inst) => (
                                    <TableRow key={inst.id} className="border-b border-gray-100 dark:border-white/10 hover:bg-gray-50/50 dark:hover:bg-white/5">
                                        <TableCell className="px-4 py-2 font-semibold">{inst.customer?.name}</TableCell>
                                        <TableCell className="px-4 py-2 text-xs font-mono text-blue-600 cursor-pointer hover:underline" onClick={() => fetchDetail(inst.id)}>{inst.sale?.invoiceNo}</TableCell>
                                        <TableCell className="px-4 py-2 font-bold">{formatPrice(inst.totalAmount)}</TableCell>
                                        <TableCell className="px-4 py-2 text-sm">{formatPrice(inst.downPayment)}</TableCell>
                                        <TableCell className="px-4 py-2 text-sm font-bold text-red-600">{formatPrice(inst.remaining)}</TableCell>
                                        <TableCell className="px-4 py-2 text-sm">{formatPrice(inst.monthlyAmount)} × {inst.totalMonths}mo</TableCell>
                                        <TableCell className="px-4 py-2">
                                            <Badge variant="secondary" className={`text-xs border-0 ${STATUS_MAP[inst.status]}`}>{inst.status}</Badge>
                                        </TableCell>
                                        <TableCell className="px-4 py-2 text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => fetchDetail(inst.id)}>
                                                    <Eye className="h-3.5 w-3.5 mr-1" /> View
                                                </Button>
                                                {inst.status === 'ACTIVE' && (
                                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-green-600" onClick={() => { setSelectedInst(inst); payForm.reset({ amount: Number(inst.monthlyAmount), note: '' }); setPayDialogOpen(true); }}>
                                                        <DollarSign className="h-3.5 w-3.5 mr-1" /> Pay
                                                    </Button>
                                                )}
                                            </div>
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

            {/* Create Installment Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 overflow-visible border-none shadow-none bg-transparent">
                    <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                        <div className="relative mx-4 -mt-6 mb-4 grid h-20 place-items-center rounded-xl bg-gradient-to-tr from-amber-700 to-amber-500 shadow-lg shadow-amber-500/20">
                            <DialogTitle className="text-xl font-semibold text-white">New Installment</DialogTitle>
                        </div>
                        <div className="px-6 pb-6 pt-2">
                            <DialogDescription className="sr-only">Create installment plan</DialogDescription>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
                                    <FormField control={form.control} name="saleId" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Sale Invoice *</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value ? String(field.value) : ''}>
                                                <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select sale" /></SelectTrigger></FormControl>
                                                <SelectContent>{sales.filter(s => s.status === 'COMPLETED').map(s => <SelectItem key={s.id} value={String(s.id)}>{s.invoiceNo}</SelectItem>)}</SelectContent>
                                            </Select><FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="customerId" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Customer *</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value ? String(field.value) : ''}>
                                                <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select customer" /></SelectTrigger></FormControl>
                                                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                                            </Select><FormMessage />
                                        </FormItem>
                                    )} />
                                    <div className="grid grid-cols-2 gap-3">
                                        <FormField control={form.control} name="totalAmount" render={({ field }) => (
                                            <FormItem><FormLabel>Total Amount *</FormLabel><FormControl><Input type="number" className="h-10" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="downPayment" render={({ field }) => (
                                            <FormItem><FormLabel>Down Payment *</FormLabel><FormControl><Input type="number" className="h-10" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <FormField control={form.control} name="monthlyAmount" render={({ field }) => (
                                            <FormItem><FormLabel>Monthly *</FormLabel><FormControl><Input type="number" className="h-10" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="totalMonths" render={({ field }) => (
                                            <FormItem><FormLabel>Months *</FormLabel><FormControl><Input type="number" className="h-10" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                    <Button type="submit" disabled={form.formState.isSubmitting} className="w-full bg-amber-600 hover:bg-amber-700 text-white h-10 text-xs font-bold uppercase mt-2">
                                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Create Installment
                                    </Button>
                                </form>
                            </Form>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Payment Dialog */}
            <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
                <DialogContent className="sm:max-w-[380px] p-0 overflow-visible border-none shadow-none bg-transparent">
                    <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                        <div className="relative mx-4 -mt-6 mb-4 grid h-16 place-items-center rounded-xl bg-gradient-to-tr from-green-600 to-green-400 shadow-lg shadow-green-500/20">
                            <DialogTitle className="text-lg font-semibold text-white">Record Payment</DialogTitle>
                        </div>
                        <div className="px-6 pb-6 pt-2">
                            <DialogDescription className="sr-only">Record payment</DialogDescription>
                            {selectedInst && <p className="text-sm text-gray-500 mb-3">Remaining: <strong className="text-red-600">{formatPrice(selectedInst.remaining)}</strong></p>}
                            <Form {...payForm}>
                                <form onSubmit={payForm.handleSubmit(onPay)} className="flex flex-col gap-3">
                                    <FormField control={payForm.control} name="amount" render={({ field }) => (
                                        <FormItem><FormLabel>Amount *</FormLabel><FormControl><Input type="number" className="h-10" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={payForm.control} name="note" render={({ field }) => (
                                        <FormItem><FormLabel>Note</FormLabel><FormControl><Input className="h-10" {...field} /></FormControl></FormItem>
                                    )} />
                                    <Button type="submit" disabled={payForm.formState.isSubmitting} className="w-full bg-green-600 hover:bg-green-700 text-white h-10 text-xs font-bold uppercase">
                                        {payForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Record Payment
                                    </Button>
                                </form>
                            </Form>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Detail Dialog */}
            <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogTitle className="text-lg font-bold">Installment Details</DialogTitle>
                    <DialogDescription className="sr-only">Details</DialogDescription>
                    {detail && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><span className="text-gray-500">Customer:</span> <strong>{detail.customer?.name}</strong></div>
                                <div><span className="text-gray-500">Invoice:</span> <strong className="font-mono">{detail.sale?.invoiceNo}</strong></div>
                                <div><span className="text-gray-500">Total:</span> <strong>{formatPrice(detail.totalAmount)}</strong></div>
                                <div><span className="text-gray-500">Down Payment:</span> <strong>{formatPrice(detail.downPayment)}</strong></div>
                                <div><span className="text-gray-500">Remaining:</span> <strong className="text-red-600">{formatPrice(detail.remaining)}</strong></div>
                                <div><span className="text-gray-500">Status:</span> <Badge variant="secondary" className={`text-xs border-0 ${STATUS_MAP[detail.status]}`}>{detail.status}</Badge></div>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2">Payment History ({detail.payments?.length || 0})</h4>
                                {detail.payments?.length === 0 ? (
                                    <p className="text-sm text-gray-400">No payments yet</p>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {detail.payments?.map((p: any) => (
                                            <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                                <div>
                                                    <p className="text-sm font-bold text-green-600">{formatPrice(p.amount)}</p>
                                                    <p className="text-xs text-gray-500">{p.note || ''}</p>
                                                </div>
                                                <span className="text-xs text-gray-400">{format(new Date(p.paidAt), 'dd MMM yyyy HH:mm')}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
