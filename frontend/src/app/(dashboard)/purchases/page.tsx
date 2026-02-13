'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Eye, Trash2, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
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

const formatPrice = (n: number | string) => {
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
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState<any>(null);

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

    const viewDetail = async (id: number) => {
        try {
            const res = await api.get(`/purchases/${id}`);
            setSelectedPurchase(res.data);
            setDetailOpen(true);
        } catch { toast.error('Failed to load details'); }
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
                                            <TableCell className="px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white">{formatPrice(p.totalAmount)}</TableCell>
                                            <TableCell className="px-4 py-2 text-xs text-gray-500">{formatPrice(p.paidAmount)}</TableCell>
                                            <TableCell className="px-4 py-2">
                                                <Badge variant="secondary" className={`text-xs font-medium border-0 ${STATUS_COLORS[p.status] || ''}`}>
                                                    {p.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-4 py-2 text-xs text-gray-500">{format(new Date(p.createdAt), 'dd MMM yyyy')}</TableCell>
                                            <TableCell className="px-4 py-2 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-600 hover:text-gray-900 dark:text-gray-400" onClick={() => viewDetail(p.id)}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
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

            {/* Detail Dialog */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="sm:max-w-[600px] p-0 overflow-visible border-none shadow-none bg-transparent">
                    <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                        <div className="relative mx-4 -mt-6 mb-4 grid h-20 place-items-center overflow-hidden rounded-xl bg-gradient-to-tr from-gray-900 to-gray-800 bg-clip-border text-white shadow-lg shadow-gray-900/20">
                            <DialogTitle className="text-xl font-semibold text-white">Purchase #{selectedPurchase?.id}</DialogTitle>
                        </div>
                        <div className="px-6 pb-6 pt-2">
                            <DialogDescription className="sr-only">Purchase details</DialogDescription>
                            {selectedPurchase && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div><span className="text-gray-500 dark:text-gray-400">Supplier:</span> <span className="font-semibold text-gray-900 dark:text-white">{selectedPurchase.supplier?.name}</span></div>
                                        <div><span className="text-gray-500 dark:text-gray-400">Status:</span> <Badge variant="secondary" className={`ml-1 text-xs border-0 ${STATUS_COLORS[selectedPurchase.status]}`}>{selectedPurchase.status}</Badge></div>
                                        <div><span className="text-gray-500 dark:text-gray-400">Total:</span> <span className="font-bold">{formatPrice(selectedPurchase.totalAmount)}</span></div>
                                        <div><span className="text-gray-500 dark:text-gray-400">Paid:</span> <span className="font-medium">{formatPrice(selectedPurchase.paidAmount)}</span></div>
                                        <div><span className="text-gray-500 dark:text-gray-400">Date:</span> {format(new Date(selectedPurchase.createdAt), 'dd MMM yyyy, hh:mm a')}</div>
                                        {selectedPurchase.note && <div className="col-span-2"><span className="text-gray-500 dark:text-gray-400">Note:</span> {selectedPurchase.note}</div>}
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-bold uppercase text-gray-400 mb-2">Items</h4>
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
                                                        <TableCell className="text-sm">{item.product?.name} <span className="text-xs text-gray-400">({item.product?.barcode})</span></TableCell>
                                                        <TableCell className="text-sm text-center">{item.quantity}</TableCell>
                                                        <TableCell className="text-sm text-right">{formatPrice(item.unitCost)}</TableCell>
                                                        <TableCell className="text-sm text-right font-semibold">{formatPrice(Number(item.unitCost) * item.quantity)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
