'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, Tag, X } from 'lucide-react';
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
import { ExpenseDialog } from '@/components/expense-dialog';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import api from '@/lib/axios';

const PAGE_SIZE_OPTIONS = [10, 50, 100];

const formatPrice = (n: number | string) => {
    const num = Number(n);
    if (isNaN(num)) return '0';
    return num % 1 === 0
        ? num.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<any>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState<any>(null);
    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [totalAmount, setTotalAmount] = useState(0);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(PAGE_SIZE_OPTIONS[0]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const fetchCategories = () => {
        api.get('/expenses/categories').then(r => setCategories(r.data || [])).catch(() => { });
    };

    const fetchExpenses = async (currentPage = page, currentLimit = limit) => {
        try {
            let url = `/expenses?q=${search}&page=${currentPage}&limit=${currentLimit}`;
            if (categoryFilter !== 'ALL') url += `&categoryId=${categoryFilter}`;
            if (dateFrom) url += `&from=${dateFrom}`;
            if (dateTo) url += `&to=${dateTo}`;
            const res = await api.get(url);
            setExpenses(res.data.data);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
            setTotalAmount(Number(res.data.totalAmount) || 0);
        } catch (error) {
            console.error('Failed to fetch expenses', error);
        }
    };

    useEffect(() => { fetchCategories(); }, []);

    useEffect(() => {
        setPage(1);
        const timer = setTimeout(() => fetchExpenses(1), 500);
        return () => clearTimeout(timer);
    }, [search, categoryFilter, dateFrom, dateTo]);

    useEffect(() => { fetchExpenses(page); }, [page]);

    const handleLimitChange = (newLimit: string) => {
        const l = Number(newLimit);
        setLimit(l);
        setPage(1);
        fetchExpenses(1, l);
    };

    const handleEdit = (expense: any) => {
        setEditingExpense(expense);
        setDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!expenseToDelete) return;
        try {
            await api.delete(`/expenses/${expenseToDelete.id}`);
            fetchExpenses();
            setDeleteDialogOpen(false);
            setExpenseToDelete(null);
            toast.success('Expense deleted');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete');
            setDeleteDialogOpen(false);
        }
    };

    const addCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            await api.post('/expenses/categories', { name: newCategoryName.trim() });
            toast.success('Category added');
            setNewCategoryName('');
            fetchCategories();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to add category');
        }
    };

    const deleteCategory = async (id: number) => {
        try {
            await api.delete(`/expenses/categories/${id}`);
            toast.success('Category deleted');
            fetchCategories();
            if (categoryFilter === String(id)) setCategoryFilter('ALL');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete');
        }
    };

    return (
        <div className="mt-6 mb-4 flex flex-col gap-6">
            {/* Total summary card */}
            <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940] p-5">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Expenses (filtered)</p>
                        <p className="text-3xl font-bold text-red-600 dark:text-red-400">{formatPrice(totalAmount)}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setCategoryDialogOpen(true)}>
                        <Tag className="h-4 w-4 mr-1" /> Manage Categories
                    </Button>
                </div>
            </div>

            <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                <div className="relative mx-4 -mt-6 overflow-hidden rounded-xl bg-gradient-to-tr from-red-700 to-red-500 bg-clip-border p-6 text-white shadow-lg shadow-red-500/20 flex items-center justify-between">
                    <div>
                        <h6 className="block text-xl font-bold leading-relaxed tracking-normal text-white antialiased">
                            Expenses
                        </h6>
                        <p className="font-sans text-sm font-normal leading-normal text-red-100 antialiased opacity-80">
                            Track shop operating costs
                        </p>
                    </div>
                    <Button onClick={() => { setEditingExpense(null); setDialogOpen(true); }} className="bg-white text-red-700 hover:bg-white/90">
                        <Plus className="mr-2 h-4 w-4" /> Add Expense
                    </Button>
                </div>

                <div className="px-0 overflow-x-auto">
                    <div className="px-4 py-3 flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search expenses..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-10 bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700"
                            />
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="h-10 w-[150px] text-sm border-gray-200 dark:border-gray-700">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Categories</SelectItem>
                                {categories.map(c => (
                                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                            className="h-10 w-[140px] text-sm border-gray-200 dark:border-gray-700" placeholder="From" />
                        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                            className="h-10 w-[140px] text-sm border-gray-200 dark:border-gray-700" placeholder="To" />
                        {(dateFrom || dateTo) && (
                            <Button variant="ghost" size="sm" className="text-xs text-gray-500" onClick={() => { setDateFrom(''); setDateTo(''); }}>
                                <X className="h-3 w-3 mr-1" /> Clear Dates
                            </Button>
                        )}
                    </div>

                    <div className="max-h-[calc(100vh-420px)] overflow-y-auto">
                        <Table className="w-full min-w-[700px] table-auto text-left text-sm">
                            <TableHeader className="sticky top-0 z-10 bg-white dark:bg-[#202940]">
                                <TableRow className="border-b border-gray-100 dark:border-white/10">
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Date</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Title</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Category</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Amount</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Note</TableHead>
                                    <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="px-4 py-6 text-center text-gray-500">No expenses found.</TableCell>
                                    </TableRow>
                                ) : (
                                    expenses.map((e) => (
                                        <TableRow key={e.id} className="border-b border-gray-100 dark:border-white/10 hover:bg-gray-50/50 dark:hover:bg-white/5">
                                            <TableCell className="px-4 py-2 text-xs text-gray-500">{format(new Date(e.date), 'dd MMM yyyy')}</TableCell>
                                            <TableCell className="px-4 py-2 font-semibold text-sm text-gray-900 dark:text-white">{e.title}</TableCell>
                                            <TableCell className="px-4 py-2">
                                                {e.category ? (
                                                    <Badge variant="outline" className="text-xs">{e.category.name}</Badge>
                                                ) : (
                                                    <span className="text-xs text-gray-400">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="px-4 py-2 text-sm font-bold text-red-600 dark:text-red-400">{formatPrice(e.amount)}</TableCell>
                                            <TableCell className="px-4 py-2 text-xs text-gray-500 max-w-[200px] truncate">{e.note || '-'}</TableCell>
                                            <TableCell className="px-4 py-2 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-600 hover:text-gray-900 dark:text-gray-400" onClick={() => handleEdit(e)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        onClick={() => { setExpenseToDelete(e); setDeleteDialogOpen(true); }}>
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

            <ExpenseDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={() => { fetchExpenses(); fetchCategories(); }} expense={editingExpense} />
            <DeleteConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={confirmDelete}
                title="Delete Expense" description="Are you sure you want to delete this expense?" />

            {/* Category Management Dialog */}
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogContent className="sm:max-w-[400px] p-0 overflow-visible border-none shadow-none bg-transparent">
                    <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                        <div className="relative mx-4 -mt-6 mb-4 grid h-16 place-items-center overflow-hidden rounded-xl bg-gradient-to-tr from-red-700 to-red-500 bg-clip-border text-white shadow-lg shadow-red-500/20">
                            <DialogTitle className="text-lg font-semibold text-white">Expense Categories</DialogTitle>
                        </div>
                        <div className="px-6 pb-6 pt-2">
                            <DialogDescription className="sr-only">Manage expense categories</DialogDescription>
                            <div className="flex gap-2 mb-4">
                                <Input
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="New category name"
                                    className="h-9 text-sm border-gray-300 dark:border-white/20"
                                    onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                                />
                                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={addCategory}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="space-y-1 max-h-60 overflow-y-auto">
                                {categories.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-4">No categories yet</p>
                                ) : (
                                    categories.map(c => (
                                        <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <div>
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</span>
                                                <span className="text-xs text-gray-400 ml-2">({c._count?.expenses || 0})</span>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700"
                                                onClick={() => deleteCategory(c.id)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
