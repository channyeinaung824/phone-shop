'use client';

import { useEffect, useState, useRef } from 'react';
import { Plus, Search, Pencil, Trash2, Upload, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
import { ProductDialog } from '@/components/product-dialog';
import api from '@/lib/axios';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PAGE_SIZE_OPTIONS = [10, 50, 100];

const formatPrice = (price: number | string) => {
    const num = Number(price);
    if (isNaN(num)) return '0';
    return num % 1 === 0
        ? num.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(PAGE_SIZE_OPTIONS[0]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

    const fetchProducts = async (currentPage = page, currentLimit = limit, currentSort = sortOrder) => {
        try {
            let url = `/products?q=${search}&page=${currentPage}&limit=${currentLimit}`;
            if (currentSort) {
                url += `&sortBy=barcode&sortOrder=${currentSort}`;
            }
            const res = await api.get(url);
            setProducts(res.data.data);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
        } catch (error) {
            console.error('Failed to fetch products', error);
        }
    };

    // Debounce search & reset page
    useEffect(() => {
        setPage(1);
        const timer = setTimeout(() => {
            fetchProducts(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Fetch when page changes (but not on search change — that's handled above)
    useEffect(() => {
        fetchProducts(page);
    }, [page]);

    // Fetch when limit changes
    const handleLimitChange = (newLimit: string) => {
        const l = Number(newLimit);
        setLimit(l);
        setPage(1);
        fetchProducts(1, l);
    };

    const toggleBarcodeSort = () => {
        const next = sortOrder === null ? 'asc' : sortOrder === 'asc' ? 'desc' : null;
        setSortOrder(next);
        setPage(1);
        fetchProducts(1, limit, next);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/products/${deleteId}`);
            toast.success('Product deleted successfully');
            fetchProducts();
        } catch (error: any) {
            console.error(error);
            const message = error.response?.data?.message || 'Failed to delete product';
            toast.error(message);
        } finally {
            setDeleteId(null);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const promise = api.post('/products/import', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            toast.promise(promise, {
                loading: 'Importing products...',
                success: (data) => {
                    fetchProducts();
                    return `Imported ${data.data.successCount} products. Errors: ${data.data.failCount}`;
                },
                error: 'Failed to import products',
            });
            await promise;
        } catch (error) {
            console.error('Import error', error);
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="mt-6 mb-4 flex flex-col gap-6">
            <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-gray-800 dark:text-white">
                <div className="relative mx-4 -mt-6 mb-2 grid h-24 place-items-center overflow-hidden rounded-xl bg-gradient-to-tr from-gray-900 to-gray-800 bg-clip-border text-white shadow-lg shadow-gray-900/20">
                    <div className="flex w-full items-center justify-between px-8">
                        <div>
                            <h2 className="block font-sans text-2xl font-semibold leading-snug tracking-normal text-white antialiased">
                                Products
                            </h2>
                            <p className="block font-sans text-sm font-normal leading-relaxed text-white antialiased opacity-75">
                                Manage your inventory, prices, and stock.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept=".xlsx, .xls"
                            />
                            <Button
                                variant="outline"
                                onClick={handleImportClick}
                                className="border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent"
                            >
                                <Upload className="mr-2 h-4 w-4" /> Import Excel
                            </Button>
                            <Button
                                onClick={() => { setSelectedProduct(null); setOpenDialog(true); }}
                                className="bg-white text-gray-900 hover:bg-white/90"
                            >
                                <Plus className="mr-2 h-4 w-4" /> Add Product
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="px-0 overflow-x-auto">
                    <div className="px-4 pb-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search by name, brand, or barcode..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-10 bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700"
                            />
                        </div>
                    </div>

                    <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
                        <Table className="w-full min-w-[640px] table-auto text-left text-sm">
                            <TableHeader className="sticky top-0 z-10 bg-white dark:bg-gray-800">
                                <TableRow className="border-b border-gray-100 dark:border-white/10">
                                    <TableHead
                                        className="px-3 py-2 border-b border-gray-100 dark:border-white/10 text-xs font-bold uppercase text-gray-400 dark:text-gray-300 cursor-pointer select-none hover:text-gray-600 dark:hover:text-gray-100"
                                        onClick={toggleBarcodeSort}
                                    >
                                        <div className="flex items-center gap-1">
                                            Barcode
                                            {sortOrder === null && <ArrowUpDown className="h-3 w-3" />}
                                            {sortOrder === 'asc' && <ArrowUp className="h-3 w-3" />}
                                            {sortOrder === 'desc' && <ArrowDown className="h-3 w-3" />}
                                        </div>
                                    </TableHead>
                                    <TableHead className="px-3 py-2 border-b border-gray-100 dark:border-white/10 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">Name</TableHead>
                                    <TableHead className="px-3 py-2 border-b border-gray-100 dark:border-white/10 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">Brand</TableHead>
                                    <TableHead className="px-3 py-2 border-b border-gray-100 dark:border-white/10 text-xs font-bold uppercase text-gray-400 dark:text-gray-300">Category</TableHead>
                                    <TableHead className="px-3 py-2 border-b border-gray-100 dark:border-white/10 text-xs font-bold uppercase text-gray-400 dark:text-gray-300 text-right">Price</TableHead>
                                    <TableHead className="px-3 py-2 border-b border-gray-100 dark:border-white/10 text-xs font-bold uppercase text-gray-400 dark:text-gray-300 text-right">Stock</TableHead>
                                    <TableHead className="px-3 py-2 border-b border-gray-100 dark:border-white/10 text-xs font-bold uppercase text-gray-400 dark:text-gray-300 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {products.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="px-3 py-6 border-b border-gray-100 dark:border-white/10 text-center text-gray-500">
                                            No products found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    products.map((product) => (
                                        <TableRow key={product.id} className="border-b border-gray-100 dark:border-white/10 hover:bg-gray-50/50 dark:hover:bg-white/5">
                                            <TableCell className="px-3 py-2 font-mono text-xs">{product.barcode}</TableCell>
                                            <TableCell className="px-3 py-2 font-semibold text-gray-900 dark:text-gray-100">{product.name}</TableCell>
                                            <TableCell className="px-3 py-2">{product.brand}</TableCell>
                                            <TableCell className="px-3 py-2">{product.category?.name || '-'}</TableCell>
                                            <TableCell className="px-3 py-2 text-right font-medium">{formatPrice(product.price)}</TableCell>
                                            <TableCell className="px-3 py-2 text-right">{product.stock}</TableCell>
                                            <TableCell className="px-3 py-2 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                                        onClick={() => {
                                                            setSelectedProduct(product);
                                                            setOpenDialog(true);
                                                        }}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        onClick={() => setDeleteId(product.id)}
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

                    {/* Pagination Controls */}
                    {totalPages > 0 && (
                        <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Rows per page</span>
                                    <Select value={String(limit)} onValueChange={handleLimitChange}>
                                        <SelectTrigger className="h-7 w-[65px] text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PAGE_SIZE_OPTIONS.map((opt) => (
                                                <SelectItem key={opt} value={String(opt)} className="text-xs">
                                                    {opt}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Showing{' '}
                                    <span className="font-medium text-gray-700 dark:text-gray-200">
                                        {total === 0 ? 0 : (page - 1) * limit + 1}
                                    </span>
                                    –
                                    <span className="font-medium text-gray-700 dark:text-gray-200">
                                        {Math.min(page * limit, total)}
                                    </span>
                                    {' '}of{' '}
                                    <span className="font-medium text-gray-700 dark:text-gray-200">{total}</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter((p) => {
                                        if (totalPages <= 7) return true;
                                        if (p === 1 || p === totalPages) return true;
                                        if (Math.abs(p - page) <= 1) return true;
                                        return false;
                                    })
                                    .reduce<(number | string)[]>((acc, p, idx, arr) => {
                                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                                            acc.push('...' + p);
                                        }
                                        acc.push(p);
                                        return acc;
                                    }, [])
                                    .map((item) => {
                                        if (typeof item === 'string') {
                                            return (
                                                <span key={item} className="px-1 text-sm text-gray-400 select-none">
                                                    …
                                                </span>
                                            );
                                        }
                                        return (
                                            <Button
                                                key={item}
                                                variant={item === page ? 'default' : 'outline'}
                                                size="icon"
                                                className={`h-8 w-8 text-xs ${item === page
                                                    ? 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200'
                                                    : ''
                                                    }`}
                                                onClick={() => setPage(item)}
                                            >
                                                {item}
                                            </Button>
                                        );
                                    })}
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ProductDialog
                open={openDialog}
                onOpenChange={setOpenDialog}
                product={selectedProduct}
                onSuccess={fetchProducts}
            />

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the product.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
