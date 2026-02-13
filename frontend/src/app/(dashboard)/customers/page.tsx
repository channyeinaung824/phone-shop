'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, Phone, Mail } from 'lucide-react';
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
import { CustomerDialog } from '@/components/customer-dialog';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import api from '@/lib/axios';

const PAGE_SIZE_OPTIONS = [10, 50, 100];

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState<any>(null);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(PAGE_SIZE_OPTIONS[0]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const fetchCustomers = async (currentPage = page, currentLimit = limit) => {
        try {
            const res = await api.get(`/customers?q=${search}&page=${currentPage}&limit=${currentLimit}`);
            setCustomers(res.data.data);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
        } catch (error) {
            console.error('Failed to fetch customers', error);
        }
    };

    useEffect(() => {
        setPage(1);
        const timer = setTimeout(() => fetchCustomers(1), 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        fetchCustomers(page);
    }, [page]);

    const handleLimitChange = (newLimit: string) => {
        const l = Number(newLimit);
        setLimit(l);
        setPage(1);
        fetchCustomers(1, l);
    };

    const confirmDelete = async () => {
        if (!customerToDelete) return;
        try {
            await api.delete(`/customers/${customerToDelete.id}`);
            fetchCustomers();
            setDeleteDialogOpen(false);
            setCustomerToDelete(null);
            toast.success('Customer deleted successfully');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete customer');
            setDeleteDialogOpen(false);
        }
    };

    return (
        <div className="mt-6 mb-4 flex flex-col gap-6">
            <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                <div className="relative mx-4 -mt-6 overflow-hidden rounded-xl bg-gradient-to-tr from-gray-900 to-gray-800 bg-clip-border p-6 text-white shadow-lg shadow-gray-900/20 flex items-center justify-between">
                    <div>
                        <h6 className="block text-xl font-bold leading-relaxed tracking-normal text-white antialiased">
                            Customers
                        </h6>
                        <p className="font-sans text-sm font-normal leading-normal text-gray-200 antialiased opacity-80">
                            Manage your customers
                        </p>
                    </div>
                    <Button
                        onClick={() => { setSelectedCustomer(null); setDialogOpen(true); }}
                        className="bg-white text-gray-900 hover:bg-white/90"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add Customer
                    </Button>
                </div>

                <div className="px-0 overflow-x-auto">
                    <div className="px-4 py-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search by name, phone, or email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-10 bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700"
                            />
                        </div>
                    </div>

                    <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
                        <Table className="w-full min-w-[640px] table-auto text-left text-sm">
                            <TableHeader className="sticky top-0 z-10 bg-white dark:bg-[#202940]">
                                <TableRow className="border-b border-gray-100 dark:border-white/10">
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">Customer</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">Email</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">Address</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">Note</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-300 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="px-4 py-6 text-center text-gray-500">
                                            No customers found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    customers.map((customer) => (
                                        <TableRow key={customer.id} className="border-b border-gray-100 dark:border-white/10 hover:bg-gray-50/50 dark:hover:bg-white/5">
                                            <TableCell className="px-4 py-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white text-xs font-medium dark:bg-white dark:text-gray-900">
                                                        {customer.name?.[0] || 'C'}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{customer.name}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                            <Phone className="h-3 w-3" /> {customer.phone}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                                                {customer.email ? (
                                                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {customer.email}</span>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                                                {customer.address || '-'}
                                            </TableCell>
                                            <TableCell className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 max-w-[150px] truncate">
                                                {customer.note || '-'}
                                            </TableCell>
                                            <TableCell className="px-4 py-2 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                                        onClick={() => { setSelectedCustomer(customer); setDialogOpen(true); }}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                                        onClick={() => { setCustomerToDelete(customer); setDeleteDialogOpen(true); }}
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

            <CustomerDialog open={dialogOpen} onOpenChange={setDialogOpen} customer={selectedCustomer} onSuccess={fetchCustomers} />
            <DeleteConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={confirmDelete}
                title="Delete Customer" description={`Are you sure you want to delete ${customerToDelete?.name}? This action cannot be undone.`} />
        </div>
    );
}
