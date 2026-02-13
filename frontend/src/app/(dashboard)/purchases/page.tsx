'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Package, CreditCard, Pencil, Trash2, ChevronLeft, ChevronRight, Check, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { PurchaseDialog } from '@/components/purchase-dialog';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import api from '@/lib/axios';

const PAGE_SIZE_OPTIONS = [10, 50, 100];

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    RECEIVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    CASH: 'Cash',
    BANK_TRANSFER: 'Bank Transfer',
    KPAY: 'KPay',
    WAVE_PAY: 'Wave Pay',
    INSTALLMENT: 'Installment',
    OTHER: 'Other',
};

const fmt = (n: number | string) => {
    const num = Number(n);
    if (isNaN(num)) return '0';
    return num % 1 === 0
        ? num.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function PurchasesPage() {
    const [purchases, setPurchases] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [purchaseToDelete, setPurchaseToDelete] = useState<any>(null);

    // 3 detail dialogs
    const [itemDetailOpen, setItemDetailOpen] = useState(false);
    const [paymentDetailOpen, setPaymentDetailOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState<any>(null);

    // Edit state
    const [editItems, setEditItems] = useState<any[]>([]);
    const [editPaymentMethod, setEditPaymentMethod] = useState('CASH');
    const [editPaidAmount, setEditPaidAmount] = useState(0);
    const [saving, setSaving] = useState(false);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(PAGE_SIZE_OPTIONS[0]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const fetchPurchases = async (currentPage = page, currentLimit = limit) => {
        try {
            let url = `/purchases?q=${search}&page=${currentPage}&limit=${currentLimit}`;
            if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
            const res = await api.get(url);
            setPurchases(res.data.data);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
        } catch (error) {
            console.error('Failed to fetch purchases', error);
        }
    };

    useEffect(() => {
        setPage(1);
        const timer = setTimeout(() => fetchPurchases(1), 500);
        return () => clearTimeout(timer);
    }, [search, statusFilter]);

    useEffect(() => { fetchPurchases(page); }, [page]);

    const handleLimitChange = (newLimit: string) => {
        const l = Number(newLimit);
        setLimit(l);
        setPage(1);
        fetchPurchases(1, l);
    };

    const handleStatusChange = async (purchaseId: number, newStatus: string) => {
        try {
            await api.put(`/purchases/${purchaseId}`, { status: newStatus });
            toast.success(`Purchase marked as ${newStatus.toLowerCase()}`);
            fetchPurchases();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update status');
        }
    };

    const confirmDelete = async () => {
        if (!purchaseToDelete) return;
        try {
            await api.delete(`/purchases/${purchaseToDelete.id}`);
            fetchPurchases();
            setDeleteDialogOpen(false);
            setPurchaseToDelete(null);
            toast.success('Purchase deleted');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete');
            setDeleteDialogOpen(false);
        }
    };

    const loadDetail = async (id: number) => {
        try {
            const res = await api.get(`/purchases/${id}`);
            return res.data;
        } catch { toast.error('Failed to load details'); return null; }
    };

    // Icon 1: Item Detail
    const openItemDetail = async (id: number) => {
        const data = await loadDetail(id);
        if (data) { setSelectedPurchase(data); setItemDetailOpen(true); }
    };

    // Icon 2: Payment Detail
    const openPaymentDetail = async (id: number) => {
        const data = await loadDetail(id);
        if (data) { setSelectedPurchase(data); setPaymentDetailOpen(true); }
    };

    // Icon 3: Edit
    const openEdit = async (id: number) => {
        const data = await loadDetail(id);
        if (data) {
            setSelectedPurchase(data);
            setEditItems(data.items?.map((it: any) => ({
                id: it.id,
                productId: it.productId,
                productName: it.product?.name || '',
                barcode: it.product?.barcode || '',
                quantity: it.quantity,
                unitCost: Number(it.unitCost),
            })) || []);
            setEditPaymentMethod(data.paymentMethod || 'CASH');
            setEditPaidAmount(Number(data.paidAmount) || 0);
            setEditOpen(true);
        }
    };

    // Edit calculations
    const editItemsTotal = editItems.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitCost) || 0), 0);
    const editReduceAmount = selectedPurchase ? Number(selectedPurchase.reduceAmount) || 0 : 0;
    const editExpenses = selectedPurchase?.additionalExpenses || [];
    const editExpTotal = editExpenses.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
    const editNetTotal = editItemsTotal - editReduceAmount + editExpTotal;
    const editCreditAmount = Math.max(0, editNetTotal - editPaidAmount);

    const handleSaveEdit = async () => {
        if (!selectedPurchase) return;
        if (editPaidAmount > editNetTotal) {
            toast.error('Paid amount cannot exceed net total');
            return;
        }
        setSaving(true);
        try {
            await api.put(`/purchases/${selectedPurchase.id}`, {
                items: editItems.map(i => ({
                    productId: i.productId,
                    quantity: Number(i.quantity),
                    unitCost: Number(i.unitCost),
                })),
                paidAmount: editPaidAmount,
                creditAmount: editCreditAmount,
                paymentMethod: editPaymentMethod,
            });
            toast.success('Purchase updated');
            setEditOpen(false);
            fetchPurchases();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update');
        }
        setSaving(false);
    };

    return (
        <div className="mt-6 mb-4 flex flex-col gap-6">
            <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                <div className="relative mx-4 -mt-6 overflow-hidden rounded-xl bg-gradient-to-tr from-gray-900 to-gray-800 bg-clip-border p-6 text-white shadow-lg shadow-gray-900/20 flex items-center justify-between">
                    <div>
                        <h6 className="block text-xl font-bold leading-relaxed tracking-normal text-white antialiased">
                            Purchases
                        </h6>
                        <p className="font-sans text-sm font-normal leading-normal text-gray-200 antialiased opacity-80">
                            Manage purchase orders from suppliers
                        </p>
                    </div>
                    <Button onClick={() => setDialogOpen(true)} className="bg-white text-gray-900 hover:bg-white/90">
                        <Plus className="mr-2 h-4 w-4" /> New Purchase
                    </Button>
                </div>

                <div className="px-0 overflow-x-auto">
                    <div className="px-4 py-3 flex items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search by supplier name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-10 bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-10 w-[140px] text-sm border-gray-200 dark:border-gray-700">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Status</SelectItem>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="RECEIVED">Received</SelectItem>
                                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
                        <Table className="w-full min-w-[800px] table-auto text-left text-sm">
                            <TableHeader className="sticky top-0 z-10 bg-white dark:bg-[#202940]">
                                <TableRow className="border-b border-gray-100 dark:border-white/10">
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">ID</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">Supplier</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">Items</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">Total</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">Paid</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">Status</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">Date</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {purchases.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="px-4 py-6 text-center text-gray-500">No purchases found.</TableCell>
                                    </TableRow>
                                ) : (
                                    purchases.map((p) => (
                                        <TableRow key={p.id} className="border-b border-gray-100 dark:border-white/10 hover:bg-gray-50/50 dark:hover:bg-white/5">
                                            <TableCell className="px-4 py-2 text-xs font-mono text-gray-500">#{p.id}</TableCell>
                                            <TableCell className="px-4 py-2 font-semibold text-sm text-gray-900 dark:text-white">{p.supplier?.name || '-'}</TableCell>
                                            <TableCell className="px-4 py-2 text-xs text-gray-500">{p.items?.length || 0} items</TableCell>
                                            <TableCell className="px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white">{fmt(p.totalAmount)}</TableCell>
                                            <TableCell className="px-4 py-2 text-xs text-gray-500">{fmt(p.paidAmount)}</TableCell>
                                            <TableCell className="px-4 py-2">
                                                <Badge variant="secondary" className={`text-xs font-medium border-0 ${STATUS_COLORS[p.status] || ''}`}>
                                                    {p.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-4 py-2 text-xs text-gray-500">{format(new Date(p.createdAt), 'dd MMM yyyy')}</TableCell>
                                            <TableCell className="px-4 py-2 text-right">
                                                <div className="flex justify-end gap-1">
                                                    {/* Icon 1: Item Detail */}
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Item Details"
                                                        onClick={() => openItemDetail(p.id)}>
                                                        <Package className="h-4 w-4" />
                                                    </Button>
                                                    {/* Icon 2: Payment Detail */}
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20" title="Payment Details"
                                                        onClick={() => openPaymentDetail(p.id)}>
                                                        <CreditCard className="h-4 w-4" />
                                                    </Button>
                                                    {/* Icon 3: Edit */}
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20" title="Edit Purchase"
                                                        onClick={() => openEdit(p.id)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    {/* Status Actions */}
                                                    {p.status === 'PENDING' && (
                                                        <>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20" title="Mark Received"
                                                                onClick={() => handleStatusChange(p.id, 'RECEIVED')}>
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20" title="Cancel"
                                                                onClick={() => handleStatusChange(p.id, 'CANCELLED')}>
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    {/* Delete */}
                                                    {p.status !== 'RECEIVED' && (
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            onClick={() => { setPurchaseToDelete(p); setDeleteDialogOpen(true); }}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 0 && (
                        <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Rows per page</span>
                                    <Select value={String(limit)} onValueChange={handleLimitChange}>
                                        <SelectTrigger className="h-7 w-[65px] text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {PAGE_SIZE_OPTIONS.map(opt => (
                                                <SelectItem key={opt} value={String(opt)} className="text-xs">{opt}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Showing <span className="font-medium text-gray-700 dark:text-gray-200">{total === 0 ? 0 : (page - 1) * limit + 1}</span>–<span className="font-medium text-gray-700 dark:text-gray-200">{Math.min(page * limit, total)}</span> of <span className="font-medium text-gray-700 dark:text-gray-200">{total}</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => { if (totalPages <= 7) return true; if (p === 1 || p === totalPages) return true; return Math.abs(p - page) <= 1; })
                                    .reduce<(number | string)[]>((acc, p, idx, arr) => { if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...' + p); acc.push(p); return acc; }, [])
                                    .map(item => typeof item === 'string' ? (
                                        <span key={item} className="px-1 text-sm text-gray-400 select-none">…</span>
                                    ) : (
                                        <Button key={item} variant={item === page ? 'default' : 'outline'} size="icon"
                                            className={`h-8 w-8 text-xs ${item === page ? 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900' : ''}`}
                                            onClick={() => setPage(item)}>{item}
                                        </Button>
                                    ))}
                                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <PurchaseDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={fetchPurchases} />
            <DeleteConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={confirmDelete}
                title="Delete Purchase" description="Are you sure you want to delete this purchase? This action cannot be undone." />

            {/* ─── Dialog 1: Item Detail ─── */}
            <Dialog open={itemDetailOpen} onOpenChange={setItemDetailOpen}>
                <DialogContent className="sm:max-w-[600px] p-0 overflow-visible border-none shadow-none bg-transparent">
                    <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                        <div className="relative mx-4 -mt-6 mb-4 grid h-20 place-items-center overflow-hidden rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 bg-clip-border text-white shadow-lg shadow-blue-500/20">
                            <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
                                <Package className="h-5 w-5" /> Purchase #{selectedPurchase?.id} — Items
                            </DialogTitle>
                        </div>
                        <div className="px-6 pb-6 pt-2">
                            <DialogDescription className="sr-only">Purchase item details</DialogDescription>
                            {selectedPurchase && (
                                <div className="space-y-4">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        Supplier: <span className="font-semibold text-gray-900 dark:text-white">{selectedPurchase.supplier?.name}</span>
                                    </div>
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-b border-gray-100 dark:border-white/10">
                                                <TableHead className="text-xs">Product</TableHead>
                                                <TableHead className="text-xs text-center">Qty</TableHead>
                                                <TableHead className="text-xs text-right">Unit Cost</TableHead>
                                                <TableHead className="text-xs text-right">Subtotal</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedPurchase.items?.map((item: any, i: number) => (
                                                <TableRow key={i} className="border-b border-gray-100 dark:border-white/10">
                                                    <TableCell className="text-sm">
                                                        {item.product?.name}
                                                        <span className="text-xs text-gray-400 ml-1">({item.product?.barcode})</span>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-center font-medium">{item.quantity}</TableCell>
                                                    <TableCell className="text-sm text-right">{fmt(item.unitCost)}</TableCell>
                                                    <TableCell className="text-sm text-right font-bold">{fmt(Number(item.unitCost) * item.quantity)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <div className="flex justify-end">
                                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-4 py-2 text-right">
                                            <span className="text-xs text-gray-500">Items Total: </span>
                                            <span className="text-lg font-bold text-gray-900 dark:text-white">
                                                {fmt(selectedPurchase.items?.reduce((s: number, i: any) => s + Number(i.unitCost) * i.quantity, 0) || 0)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ─── Dialog 2: Payment Detail ─── */}
            <Dialog open={paymentDetailOpen} onOpenChange={setPaymentDetailOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 overflow-visible border-none shadow-none bg-transparent">
                    <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                        <div className="relative mx-4 -mt-6 mb-4 grid h-20 place-items-center overflow-hidden rounded-xl bg-gradient-to-tr from-green-700 to-green-500 bg-clip-border text-white shadow-lg shadow-green-500/20">
                            <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
                                <CreditCard className="h-5 w-5" /> Purchase #{selectedPurchase?.id} — Payment
                            </DialogTitle>
                        </div>
                        <div className="px-6 pb-6 pt-2">
                            <DialogDescription className="sr-only">Payment details</DialogDescription>
                            {selectedPurchase && (() => {
                                const itemsTotal = selectedPurchase.items?.reduce((s: number, i: any) => s + Number(i.unitCost) * i.quantity, 0) || 0;
                                const reduceAmt = Number(selectedPurchase.reduceAmount) || 0;
                                const expenses = (selectedPurchase.additionalExpenses as any[]) || [];
                                const expTotal = expenses.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
                                const netTotal = Number(selectedPurchase.totalAmount) || 0;
                                const paidAmt = Number(selectedPurchase.paidAmount) || 0;
                                const creditAmt = Number(selectedPurchase.creditAmount) || 0;

                                // Extract payment entries from additionalExpenses
                                const paymentEntries = expenses.filter((e: any) => e.label?.startsWith('Payment:'));
                                const nonPaymentExpenses = expenses.filter((e: any) => !e.label?.startsWith('Payment:'));

                                return (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
                                                <p className="text-[10px] uppercase font-bold text-gray-400">Items Total</p>
                                                <p className="text-lg font-bold text-gray-900 dark:text-white">{fmt(itemsTotal)}</p>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
                                                <p className="text-[10px] uppercase font-bold text-gray-400">Reduce Amount</p>
                                                <p className="text-lg font-bold text-orange-600">{reduceAmt > 0 ? `-${fmt(reduceAmt)}` : '0'}</p>
                                            </div>
                                        </div>

                                        {nonPaymentExpenses.length > 0 && (
                                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-2">Additional Expenses</p>
                                                {nonPaymentExpenses.map((e: any, i: number) => (
                                                    <div key={i} className="flex justify-between text-sm py-0.5">
                                                        <span className="text-gray-600 dark:text-gray-300">{e.label}</span>
                                                        <span className="font-medium">{fmt(e.amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 flex justify-between items-center">
                                            <span className="text-sm font-medium">Net Total</span>
                                            <span className="text-lg font-bold text-blue-700 dark:text-blue-400">{fmt(netTotal)}</span>
                                        </div>

                                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                                            <p className="text-[10px] uppercase font-bold text-gray-400 mb-2">Payment Method</p>
                                            {paymentEntries.length > 0 ? (
                                                paymentEntries.map((pe: any, i: number) => (
                                                    <div key={i} className="flex justify-between text-sm py-0.5">
                                                        <span className="text-gray-600 dark:text-gray-300">{pe.label.replace('Payment: ', '')}</span>
                                                        <span className="font-bold text-green-700">{fmt(pe.amount)}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="flex justify-between text-sm">
                                                    <span>{PAYMENT_METHOD_LABELS[selectedPurchase.paymentMethod] || selectedPurchase.paymentMethod}</span>
                                                    <span className="font-bold text-green-700">{fmt(paidAmt)}</span>
                                                </div>
                                            )}
                                            <div className="border-t border-green-200 dark:border-green-800 mt-2 pt-2 flex justify-between text-sm">
                                                <span className="font-medium">Total Paid</span>
                                                <span className="font-bold text-green-700">{fmt(paidAmt)}</span>
                                            </div>
                                        </div>

                                        {creditAmt > 0 && (
                                            <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-3 flex justify-between items-center">
                                                <span className="text-sm font-medium text-red-700 dark:text-red-400">Credit Amount</span>
                                                <span className="text-lg font-bold text-red-600">{fmt(creditAmt)}</span>
                                            </div>
                                        )}

                                        {selectedPurchase.note && (
                                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Note</p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300">{selectedPurchase.note}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ─── Dialog 3: Edit Purchase ─── */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-[650px] p-0 overflow-visible border-none shadow-none bg-transparent max-h-[90vh]">
                    <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                        <div className="relative mx-4 -mt-6 mb-4 grid h-20 place-items-center overflow-hidden rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 bg-clip-border text-white shadow-lg shadow-amber-500/20">
                            <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
                                <Pencil className="h-5 w-5" /> Edit Purchase #{selectedPurchase?.id}
                            </DialogTitle>
                        </div>
                        <div className="px-6 pb-6 pt-2 max-h-[calc(90vh-120px)] overflow-y-auto space-y-4">
                            <DialogDescription className="sr-only">Edit purchase items and payment</DialogDescription>

                            {/* Editable Items */}
                            <div>
                                <h4 className="text-xs font-bold uppercase text-gray-400 mb-2">Items — Edit Qty & Unit Cost</h4>
                                <div className="space-y-1">
                                    <div className="grid grid-cols-[1fr_80px_120px_100px] gap-2 text-[10px] font-bold uppercase text-gray-400 px-1">
                                        <span>Product</span>
                                        <span>Qty</span>
                                        <span>Unit Cost</span>
                                        <span className="text-right">Subtotal</span>
                                    </div>
                                    {editItems.map((item, idx) => (
                                        <div key={idx} className="grid grid-cols-[1fr_80px_120px_100px] gap-2 items-center">
                                            <div className="text-sm truncate">
                                                <span className="font-medium">{item.productName}</span>
                                                <span className="text-xs text-gray-400 ml-1">({item.barcode})</span>
                                            </div>
                                            <Input type="number" min={1} className="h-9 text-xs" value={item.quantity}
                                                onChange={(e) => { const arr = [...editItems]; arr[idx].quantity = Number(e.target.value) || 0; setEditItems(arr); }} />
                                            <Input type="number" min={0} className="h-9 text-xs" value={item.unitCost}
                                                onChange={(e) => { const arr = [...editItems]; arr[idx].unitCost = Number(e.target.value) || 0; setEditItems(arr); }} />
                                            <div className="text-sm font-bold text-right">{fmt((Number(item.quantity) || 0) * (Number(item.unitCost) || 0))}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2 flex justify-end">
                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-4 py-2 text-right">
                                        <span className="text-xs text-gray-500">Items Total: </span>
                                        <span className="text-lg font-bold">{fmt(editItemsTotal)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Net total info */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 flex justify-between items-center">
                                <span className="text-sm font-medium">Net Total <span className="text-xs text-gray-400">(items - reduce + expenses)</span></span>
                                <span className="text-lg font-bold text-blue-700 dark:text-blue-400">{fmt(editNetTotal)}</span>
                            </div>

                            {/* Payment Adjustment */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase text-gray-400">Payment Adjustment</h4>
                                <div className="flex gap-3 items-end">
                                    <div className="flex-1">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Payment Method</label>
                                        <Select value={editPaymentMethod} onValueChange={setEditPaymentMethod}>
                                            <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                                                    <SelectItem key={k} value={k}>{v}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Paid Amount</label>
                                        <Input type="number" min={0} max={editNetTotal} className="h-10" value={editPaidAmount || ''}
                                            onChange={(e) => setEditPaidAmount(Math.min(Number(e.target.value) || 0, editNetTotal))} />
                                    </div>
                                </div>

                                {editCreditAmount > 0 && (
                                    <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-3 flex justify-between items-center">
                                        <span className="text-sm font-medium text-red-700">Credit Amount</span>
                                        <span className="text-lg font-bold text-red-600">{fmt(editCreditAmount)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2 pt-2">
                                <Button type="button" variant="outline" className="flex-1 h-10" onClick={() => setEditOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="button" disabled={saving || editPaidAmount > editNetTotal} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white h-10 text-xs font-bold uppercase"
                                    onClick={handleSaveEdit}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
