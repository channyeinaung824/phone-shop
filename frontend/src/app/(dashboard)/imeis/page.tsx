'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, Smartphone } from 'lucide-react';
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
import { IMEIDialog } from '@/components/imei-dialog';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import api from '@/lib/axios';

const PAGE_SIZE_OPTIONS = [10, 50, 100];

const STATUS_COLORS: Record<string, string> = {
    IN_STOCK: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    SOLD: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    RESERVED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    DEFECTIVE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    TRADED_IN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    TRANSFERRED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const STATUS_LABELS: Record<string, string> = {
    IN_STOCK: 'In Stock',
    SOLD: 'Sold',
    RESERVED: 'Reserved',
    DEFECTIVE: 'Defective',
    TRADED_IN: 'Traded In',
    TRANSFERRED: 'Transferred',
};

export default function IMEIsPage() {
    const [imeis, setImeis] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedImei, setSelectedImei] = useState<any>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [imeiToDelete, setImeiToDelete] = useState<any>(null);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(PAGE_SIZE_OPTIONS[0]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const fetchIMEIs = async (currentPage = page, currentLimit = limit) => {
        try {
            let url = `/imeis?q=${search}&page=${currentPage}&limit=${currentLimit}`;
            if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
            const res = await api.get(url);
            setImeis(res.data.data);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
        } catch (error) {
            console.error('Failed to fetch IMEIs', error);
        }
    };

    useEffect(() => {
        setPage(1);
        const timer = setTimeout(() => fetchIMEIs(1), 500);
        return () => clearTimeout(timer);
    }, [search, statusFilter]);

    useEffect(() => {
        fetchIMEIs(page);
    }, [page]);

    const handleLimitChange = (newLimit: string) => {
        const l = Number(newLimit);
        setLimit(l);
        setPage(1);
        fetchIMEIs(1, l);
    };

    const confirmDelete = async () => {
        if (!imeiToDelete) return;
        try {
            await api.delete(`/imeis/${imeiToDelete.id}`);
            fetchIMEIs();
            setDeleteDialogOpen(false);
            setImeiToDelete(null);
            toast.success('IMEI deleted successfully');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete IMEI');
            setDeleteDialogOpen(false);
        }
    };

    return (
        <div className="mt-6 mb-4 flex flex-col gap-6">
            <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                <div className="relative mx-4 -mt-6 overflow-hidden rounded-xl bg-gradient-to-tr from-gray-900 to-gray-800 bg-clip-border p-6 text-white shadow-lg shadow-gray-900/20 flex items-center justify-between">
                    <div>
                        <h6 className="block text-xl font-bold leading-relaxed tracking-normal text-white antialiased">
                            IMEI Management
                        </h6>
                        <p className="font-sans text-sm font-normal leading-normal text-gray-200 antialiased opacity-80">
                            Track individual device serial numbers
                        </p>
                    </div>
                    <Button
                        onClick={() => { setSelectedImei(null); setDialogOpen(true); }}
                        className="bg-white text-gray-900 hover:bg-white/90"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add IMEI
                    </Button>
                </div>

                <div className="px-0 overflow-x-auto">
                    <div className="px-4 py-3 flex items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search by IMEI, product name, or barcode..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-10 bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-10 w-[150px] text-sm border-gray-200 dark:border-gray-700">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Status</SelectItem>
                                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                    <SelectItem key={val} value={val}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
                        <Table className="w-full min-w-[700px] table-auto text-left text-sm">
                            <TableHeader className="sticky top-0 z-10 bg-white dark:bg-[#202940]">
                                <TableRow className="border-b border-gray-100 dark:border-white/10">
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">IMEI</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">Product</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">Brand</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">Barcode</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">Status</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {imeis.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="px-4 py-6 text-center text-gray-500">
                                            No IMEIs found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    imeis.map((item) => (
                                        <TableRow key={item.id} className="border-b border-gray-100 dark:border-white/10 hover:bg-gray-50/50 dark:hover:bg-white/5">
                                            <TableCell className="px-4 py-2 font-mono text-xs font-semibold text-gray-900 dark:text-gray-100">
                                                <div className="flex items-center gap-2">
                                                    <Smartphone className="h-3.5 w-3.5 text-gray-400" />
                                                    {item.imei}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{item.product?.name || '-'}</TableCell>
                                            <TableCell className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">{item.product?.brand || '-'}</TableCell>
                                            <TableCell className="px-4 py-2 text-xs font-mono text-gray-500 dark:text-gray-400">{item.product?.barcode || '-'}</TableCell>
                                            <TableCell className="px-4 py-2">
                                                <Badge variant="secondary" className={`text-xs font-medium border-0 ${STATUS_COLORS[item.status] || ''}`}>
                                                    {STATUS_LABELS[item.status] || item.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-4 py-2 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                                        onClick={() => { setSelectedImei(item); setDialogOpen(true); }}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                                        onClick={() => { setImeiToDelete(item); setDeleteDialogOpen(true); }}
                                                        disabled={item.status === 'SOLD'}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
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
                                            {PAGE_SIZE_OPTIONS.map((opt) => (
                                                <SelectItem key={opt} value={String(opt)} className="text-xs">{opt}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Showing <span className="font-medium text-gray-700 dark:text-gray-200">{total === 0 ? 0 : (page - 1) * limit + 1}</span>–<span className="font-medium text-gray-700 dark:text-gray-200">{Math.min(page * limit, total)}</span> of <span className="font-medium text-gray-700 dark:text-gray-200">{total}</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter((p) => { if (totalPages <= 7) return true; if (p === 1 || p === totalPages) return true; return Math.abs(p - page) <= 1; })
                                    .reduce<(number | string)[]>((acc, p, idx, arr) => { if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...' + p); acc.push(p); return acc; }, [])
                                    .map((item) => typeof item === 'string' ? (
                                        <span key={item} className="px-1 text-sm text-gray-400 select-none">…</span>
                                    ) : (
                                        <Button key={item} variant={item === page ? 'default' : 'outline'} size="icon"
                                            className={`h-8 w-8 text-xs ${item === page ? 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200' : ''}`}
                                            onClick={() => setPage(item)}>{item}
                                        </Button>
                                    ))}
                                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <IMEIDialog open={dialogOpen} onOpenChange={setDialogOpen} imeiRecord={selectedImei} onSuccess={fetchIMEIs} />
            <DeleteConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={confirmDelete}
                title="Delete IMEI" description={`Are you sure you want to delete IMEI ${imeiToDelete?.imei}? This action cannot be undone.`} />
        </div>
    );
}
