'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Eye, ChevronLeft, ChevronRight, RotateCcw, Ban } from 'lucide-react';
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
import { SaleDialog } from '@/components/sale-dialog';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import api from '@/lib/axios';

const PAGE_SIZE_OPTIONS = [10, 50, 100];

const STATUS_COLORS: Record<string, string> = {
    COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    REFUNDED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    VOIDED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const PAYMENT_LABELS: Record<string, string> = {
    CASH: 'Cash',
    BANK_TRANSFER: 'Bank',
    KPAY: 'KPay',
    WAVE_PAY: 'Wave',
    INSTALLMENT: 'Installment',
    OTHER: 'Other',
};

const formatPrice = (n: number | string) => {
    const num = Number(n);
    if (isNaN(num)) return '0';
    return num % 1 === 0
        ? num.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function SalesPage() {
    const [sales, setSales] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState<any>(null);
    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; type: string; sale: any }>({ open: false, type: '', sale: null });

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(PAGE_SIZE_OPTIONS[0]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const fetchSales = async (currentPage = page, currentLimit = limit) => {
        try {
            let url = `/sales?q=${search}&page=${currentPage}&limit=${currentLimit}`;
            if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
            const res = await api.get(url);
            setSales(res.data.data);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
        } catch (error) {
            console.error('Failed to fetch sales', error);
        }
    };

    useEffect(() => {
        setPage(1);
        const timer = setTimeout(() => fetchSales(1), 500);
        return () => clearTimeout(timer);
    }, [search, statusFilter]);

    useEffect(() => { fetchSales(page); }, [page]);

    const handleLimitChange = (newLimit: string) => {
        const l = Number(newLimit);
        setLimit(l);
        setPage(1);
        fetchSales(1, l);
    };

    const handleAction = async () => {
        if (!confirmDialog.sale) return;
        try {
            if (confirmDialog.type === 'void') {
                await api.put(`/sales/${confirmDialog.sale.id}/void`);
                toast.success('Sale voided');
            } else {
                await api.put(`/sales/${confirmDialog.sale.id}/refund`);
                toast.success('Sale refunded');
            }
            fetchSales();
            setConfirmDialog({ open: false, type: '', sale: null });
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Action failed');
            setConfirmDialog({ open: false, type: '', sale: null });
        }
    };

    const viewDetail = async (id: number) => {
        try {
            const res = await api.get(`/sales/${id}`);
            setSelectedSale(res.data);
            setDetailOpen(true);
        } catch { toast.error('Failed to load details'); }
    };

    return (
        <div className="mt-6 mb-4 flex flex-col gap-6">
            <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                <div className="relative mx-4 -mt-6 overflow-hidden rounded-xl bg-gradient-to-tr from-gray-900 to-gray-800 bg-clip-border p-6 text-white shadow-lg shadow-gray-900/20 flex items-center justify-between">
                    <div>
                        <h6 className="block text-xl font-bold leading-relaxed tracking-normal text-white antialiased">
                            Sales
                        </h6>
                        <p className="font-sans text-sm font-normal leading-normal text-gray-200 antialiased opacity-80">
                            Track and manage sales transactions
                        </p>
                    </div>
                    <Button onClick={() => setDialogOpen(true)} className="bg-white text-gray-900 hover:bg-white/90">
                        <Plus className="mr-2 h-4 w-4" /> New Sale
                    </Button>
                </div>

                <div className="px-0 overflow-x-auto">
                    <div className="px-4 py-3 flex items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search by invoice, customer..."
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
                                <SelectItem value="COMPLETED">Completed</SelectItem>
                                <SelectItem value="REFUNDED">Refunded</SelectItem>
                                <SelectItem value="VOIDED">Voided</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
                        <Table className="w-full min-w-[900px] table-auto text-left text-sm">
                            <TableHeader className="sticky top-0 z-10 bg-white dark:bg-[#202940]">
                                <TableRow className="border-b border-gray-100 dark:border-white/10">
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">Invoice</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">Customer</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">Items</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">Total</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">Payment</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">Status</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">Seller</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">Date</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sales.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="px-4 py-6 text-center text-gray-500">No sales found.</TableCell>
                                    </TableRow>
                                ) : (
                                    sales.map((s) => (
                                        <TableRow key={s.id} className="border-b border-gray-100 dark:border-white/10 hover:bg-gray-50/50 dark:hover:bg-white/5">
                                            <TableCell className="px-4 py-2 font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline" onClick={() => viewDetail(s.id)}>
                                                {s.invoiceNo}
                                            </TableCell>
                                            <TableCell className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{s.customer?.name || 'Walk-in'}</TableCell>
                                            <TableCell className="px-4 py-2 text-xs text-gray-500">{s.items?.length || 0}</TableCell>
                                            <TableCell className="px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white">{formatPrice(s.totalAmount)}</TableCell>
                                            <TableCell className="px-4 py-2">
                                                <Badge variant="outline" className="text-xs font-medium">{PAYMENT_LABELS[s.paymentMethod] || s.paymentMethod}</Badge>
                                            </TableCell>
                                            <TableCell className="px-4 py-2">
                                                <Badge variant="secondary" className={`text-xs font-medium border-0 ${STATUS_COLORS[s.status] || ''}`}>{s.status}</Badge>
                                            </TableCell>
                                            <TableCell className="px-4 py-2 text-xs text-gray-500">{s.user?.name || '-'}</TableCell>
                                            <TableCell className="px-4 py-2 text-xs text-gray-500">{format(new Date(s.createdAt), 'dd MMM yyyy')}</TableCell>
                                            <TableCell className="px-4 py-2 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-600 hover:text-gray-900 dark:text-gray-400" onClick={() => viewDetail(s.id)}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    {s.status === 'COMPLETED' && (
                                                        <>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20" title="Refund"
                                                                onClick={() => setConfirmDialog({ open: true, type: 'refund', sale: s })}>
                                                                <RotateCcw className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Void"
                                                                onClick={() => setConfirmDialog({ open: true, type: 'void', sale: s })}>
                                                                <Ban className="h-4 w-4" />
                                                            </Button>
                                                        </>
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

            <SaleDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={fetchSales} />

            {/* Void/Refund Confirm */}
            <DeleteConfirmDialog
                open={confirmDialog.open}
                onOpenChange={(o) => !o && setConfirmDialog({ open: false, type: '', sale: null })}
                onConfirm={handleAction}
                title={confirmDialog.type === 'void' ? 'Void Sale' : 'Refund Sale'}
                description={confirmDialog.type === 'void'
                    ? `Void sale ${confirmDialog.sale?.invoiceNo}? Stock will be restored.`
                    : `Refund sale ${confirmDialog.sale?.invoiceNo}? Stock will be restored.`}
            />

            {/* Detail Dialog */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="sm:max-w-[650px] p-0 overflow-visible border-none shadow-none bg-transparent">
                    <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                        <div className="relative mx-4 -mt-6 mb-4 grid h-20 place-items-center overflow-hidden rounded-xl bg-gradient-to-tr from-gray-900 to-gray-800 bg-clip-border text-white shadow-lg shadow-gray-900/20">
                            <DialogTitle className="text-xl font-semibold text-white">{selectedSale?.invoiceNo}</DialogTitle>
                        </div>
                        <div className="px-6 pb-6 pt-2 max-h-[70vh] overflow-y-auto">
                            <DialogDescription className="sr-only">Sale details</DialogDescription>
                            {selectedSale && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div><span className="text-gray-500">Customer:</span> <span className="font-semibold">{selectedSale.customer?.name || 'Walk-in'}</span></div>
                                        <div><span className="text-gray-500">Status:</span> <Badge variant="secondary" className={`ml-1 text-xs border-0 ${STATUS_COLORS[selectedSale.status]}`}>{selectedSale.status}</Badge></div>
                                        <div><span className="text-gray-500">Payment:</span> <span className="font-medium">{PAYMENT_LABELS[selectedSale.paymentMethod]}</span></div>
                                        <div><span className="text-gray-500">Seller:</span> <span className="font-medium">{selectedSale.user?.name}</span></div>
                                        <div><span className="text-gray-500">Date:</span> {format(new Date(selectedSale.createdAt), 'dd MMM yyyy, hh:mm a')}</div>
                                        {selectedSale.note && <div className="col-span-2"><span className="text-gray-500">Note:</span> {selectedSale.note}</div>}
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-bold uppercase text-gray-400 mb-2">Items</h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="border-b border-gray-100 dark:border-white/10">
                                                    <TableHead className="text-xs">Product</TableHead>
                                                    <TableHead className="text-xs">IMEI</TableHead>
                                                    <TableHead className="text-xs text-center">Qty</TableHead>
                                                    <TableHead className="text-xs text-right">Price</TableHead>
                                                    <TableHead className="text-xs text-right">Subtotal</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedSale.items?.map((item: any, i: number) => (
                                                    <TableRow key={i} className="border-b border-gray-100 dark:border-white/10">
                                                        <TableCell className="text-sm">{item.product?.name}</TableCell>
                                                        <TableCell className="text-xs font-mono text-gray-500">{item.imei?.imei || '-'}</TableCell>
                                                        <TableCell className="text-sm text-center">{item.quantity}</TableCell>
                                                        <TableCell className="text-sm text-right">{formatPrice(item.unitPrice)}</TableCell>
                                                        <TableCell className="text-sm text-right font-semibold">{formatPrice(Number(item.unitPrice) * item.quantity - Number(item.discount))}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-1 text-sm">
                                        <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatPrice(selectedSale.subtotal)}</span></div>
                                        {Number(selectedSale.discount) > 0 && <div className="flex justify-between text-red-500"><span>Discount</span><span>-{formatPrice(selectedSale.discount)}</span></div>}
                                        {Number(selectedSale.tax) > 0 && <div className="flex justify-between text-gray-500"><span>Tax</span><span>+{formatPrice(selectedSale.tax)}</span></div>}
                                        <div className="flex justify-between font-bold text-gray-900 dark:text-white border-t pt-1"><span>Total</span><span>{formatPrice(selectedSale.totalAmount)}</span></div>
                                        <div className="flex justify-between text-gray-500"><span>Paid</span><span>{formatPrice(selectedSale.paidAmount)}</span></div>
                                        {Number(selectedSale.changeAmount) > 0 && <div className="flex justify-between text-green-600"><span>Change</span><span>{formatPrice(selectedSale.changeAmount)}</span></div>}
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
