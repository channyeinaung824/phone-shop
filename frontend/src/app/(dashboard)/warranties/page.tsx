'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { format, isAfter } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import api from '@/lib/axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';

const schema = z.object({
    productId: z.string().min(1, 'Product required'),
    imeiId: z.string().optional(),
    customerId: z.string().optional(),
    type: z.string().min(1, 'Type required'),
    startDate: z.string().min(1, 'Start date required'),
    endDate: z.string().min(1, 'End date required'),
    note: z.string().optional(),
});

const STATUS_MAP: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    EXPIRED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    CLAIMED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    VOIDED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const PAGE_SIZE_OPTIONS = [10, 50, 100];

export default function WarrantiesPage() {
    const [warranties, setWarranties] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<any>(null);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: { productId: '', imeiId: '', customerId: '', type: 'MANUFACTURER', startDate: new Date().toISOString().slice(0, 10), endDate: '', note: '' },
    });

    const fetchWarranties = async (p = page) => {
        try {
            let url = `/warranties?q=${search}&page=${p}&limit=${limit}`;
            if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
            if (typeFilter !== 'ALL') url += `&type=${typeFilter}`;
            const res = await api.get(url);
            setWarranties(res.data.data);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        api.get('/products?limit=200').then(r => setProducts(r.data.data || [])).catch(() => { });
        api.get('/customers?limit=200').then(r => setCustomers(r.data.data || [])).catch(() => { });
    }, []);

    useEffect(() => { setPage(1); const t = setTimeout(() => fetchWarranties(1), 500); return () => clearTimeout(t); }, [search, statusFilter, typeFilter]);
    useEffect(() => { fetchWarranties(page); }, [page]);

    const onSubmit = async (values: z.infer<typeof schema>) => {
        try {
            await api.post('/warranties', {
                productId: parseInt(values.productId),
                imeiId: values.imeiId ? parseInt(values.imeiId) : undefined,
                customerId: values.customerId ? parseInt(values.customerId) : undefined,
                type: values.type,
                startDate: values.startDate,
                endDate: values.endDate,
                note: values.note,
            });
            toast.success('Warranty added');
            setDialogOpen(false);
            form.reset();
            fetchWarranties();
        } catch (error: any) { toast.error(error.response?.data?.message || 'Failed'); }
    };

    const updateStatus = async (id: number, status: string) => {
        try {
            await api.put(`/warranties/${id}`, { status });
            toast.success('Status updated');
            fetchWarranties();
        } catch (error: any) { toast.error(error.response?.data?.message || 'Failed'); }
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await api.delete(`/warranties/${itemToDelete.id}`);
            toast.success('Warranty deleted');
            fetchWarranties();
        } catch (error: any) { toast.error(error.response?.data?.message || 'Failed'); }
        setDeleteDialogOpen(false);
    };

    return (
        <div className="mt-6 mb-4 flex flex-col gap-6">
            <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                <div className="relative mx-4 -mt-6 overflow-hidden rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 bg-clip-border p-6 text-white shadow-lg shadow-teal-500/20 flex items-center justify-between">
                    <div>
                        <h6 className="block text-xl font-bold">Warranties</h6>
                        <p className="text-sm text-teal-100 opacity-80">Track product & IMEI warranties</p>
                    </div>
                    <Button onClick={() => { form.reset(); setDialogOpen(true); }} className="bg-white text-teal-700 hover:bg-white/90">
                        <Plus className="mr-2 h-4 w-4" /> Add Warranty
                    </Button>
                </div>

                <div className="px-0 overflow-x-auto">
                    <div className="px-4 py-3 flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700" />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-10 w-[130px] text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Status</SelectItem>
                                {Object.keys(STATUS_MAP).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="h-10 w-[140px] text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Types</SelectItem>
                                <SelectItem value="MANUFACTURER">Manufacturer</SelectItem>
                                <SelectItem value="SHOP">Shop</SelectItem>
                                <SelectItem value="EXTENDED">Extended</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="max-h-[calc(100vh-380px)] overflow-y-auto">
                        <Table className="w-full min-w-[800px] table-auto text-left text-sm">
                            <TableHeader className="sticky top-0 z-10 bg-white dark:bg-[#202940]">
                                <TableRow className="border-b border-gray-100 dark:border-white/10">
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Product</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">IMEI</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Customer</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Type</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Period</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Status</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {warranties.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} className="px-4 py-6 text-center text-gray-500">No warranties found.</TableCell></TableRow>
                                ) : warranties.map((w) => (
                                    <TableRow key={w.id} className="border-b border-gray-100 dark:border-white/10 hover:bg-gray-50/50 dark:hover:bg-white/5">
                                        <TableCell className="px-4 py-2 font-semibold text-sm">{w.product?.name}</TableCell>
                                        <TableCell className="px-4 py-2 text-xs font-mono">{w.imei?.imei || '-'}</TableCell>
                                        <TableCell className="px-4 py-2 text-sm">{w.customer?.name || '-'}</TableCell>
                                        <TableCell className="px-4 py-2"><Badge variant="outline" className="text-xs">{w.type}</Badge></TableCell>
                                        <TableCell className="px-4 py-2 text-xs text-gray-500">
                                            {format(new Date(w.startDate), 'dd MMM yy')} — {format(new Date(w.endDate), 'dd MMM yy')}
                                            {isAfter(new Date(), new Date(w.endDate)) && w.status === 'ACTIVE' && (
                                                <span className="ml-1 text-red-500 font-bold">⚠</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-4 py-2">
                                            <Badge variant="secondary" className={`text-xs border-0 ${STATUS_MAP[w.status]}`}>{w.status}</Badge>
                                        </TableCell>
                                        <TableCell className="px-4 py-2 text-right">
                                            <div className="flex justify-end gap-1">
                                                {w.status === 'ACTIVE' && (
                                                    <>
                                                        <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600" onClick={() => updateStatus(w.id, 'CLAIMED')}>Claim</Button>
                                                        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600" onClick={() => updateStatus(w.id, 'VOIDED')}>Void</Button>
                                                    </>
                                                )}
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => { setItemToDelete(w); setDeleteDialogOpen(true); }}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {totalPages > 0 && (
                        <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                            <p className="text-xs text-gray-500">Showing {total === 0 ? 0 : (page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</p>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Warranty Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 overflow-visible border-none shadow-none bg-transparent">
                    <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                        <div className="relative mx-4 -mt-6 mb-4 grid h-20 place-items-center overflow-hidden rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 bg-clip-border text-white shadow-lg shadow-teal-500/20">
                            <DialogTitle className="text-xl font-semibold">Add Warranty</DialogTitle>
                        </div>
                        <div className="px-6 pb-6 pt-2">
                            <DialogDescription className="sr-only">Add warranty form</DialogDescription>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
                                    <FormField control={form.control} name="productId" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 dark:text-gray-300">Product *</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger className="h-10 border-gray-300 dark:border-white/20"><SelectValue placeholder="Select product" /></SelectTrigger></FormControl>
                                                <SelectContent>{products.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="customerId" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 dark:text-gray-300">Customer</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger className="h-10 border-gray-300 dark:border-white/20"><SelectValue placeholder="Select customer (optional)" /></SelectTrigger></FormControl>
                                                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="type" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 dark:text-gray-300">Type *</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger className="h-10 border-gray-300 dark:border-white/20"><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="MANUFACTURER">Manufacturer</SelectItem>
                                                    <SelectItem value="SHOP">Shop</SelectItem>
                                                    <SelectItem value="EXTENDED">Extended</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    <div className="grid grid-cols-2 gap-3">
                                        <FormField control={form.control} name="startDate" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-gray-700 dark:text-gray-300">Start Date *</FormLabel>
                                                <FormControl><Input type="date" className="h-10 border-gray-300 dark:border-white/20" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="endDate" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-gray-700 dark:text-gray-300">End Date *</FormLabel>
                                                <FormControl><Input type="date" className="h-10 border-gray-300 dark:border-white/20" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                    <FormField control={form.control} name="note" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 dark:text-gray-300">Note</FormLabel>
                                            <FormControl><Input className="h-10 border-gray-300 dark:border-white/20" {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                    <Button type="submit" disabled={form.formState.isSubmitting} className="w-full bg-teal-600 hover:bg-teal-700 text-white h-10 text-xs font-bold uppercase mt-2">
                                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Add Warranty
                                    </Button>
                                </form>
                            </Form>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <DeleteConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={confirmDelete} title="Delete Warranty" description="Are you sure?" />
        </div>
    );
}
