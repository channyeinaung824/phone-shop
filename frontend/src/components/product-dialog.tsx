'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'; // Keep checking if used elsewhere, potentially remove later if fully replaced
import { Combobox } from '@/components/ui/combobox';
import api from '@/lib/axios';

const productSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
    brand: z.string().min(1, 'Brand is required').max(50, 'Brand must be at most 50 characters'),
    model: z.string().min(1, 'Model is required').max(50, 'Model must be at most 50 characters'),
    price: z.coerce.number().positive('Price must be positive').max(99999999, 'Price is too high'),
    stock: z.coerce.number().int().nonnegative().max(10000, 'Stock cannot exceed 10000').default(0),
    barcode: z.string().min(1, 'Barcode is required').max(30, 'Barcode must be at most 30 characters'),
    categoryId: z.coerce.number().int().positive('Category is required'),
});



interface ProductDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product?: any;
    onSuccess: () => void;
}

// 1. Defined the form values type explicitly to handle strict typing
type ProductFormValues = z.infer<typeof productSchema>;

export function ProductDialog({ open, onOpenChange, product, onSuccess }: ProductDialogProps) {
    const [categories, setCategories] = useState<any[]>([]);

    // 2. Use the explicit type in useForm
    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: '',
            brand: '',
            model: '',
            price: 0,
            stock: 0,
            barcode: '',
            categoryId: 0,
        },
    });

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await api.get('/categories');
                setCategories(res.data);
            } catch (error) {
                console.error('Failed to fetch categories', error);
            }
        };
        if (open) {
            fetchCategories();
        }
    }, [open]);

    useEffect(() => {
        if (open) {
            if (product) {
                form.reset({
                    name: product.name,
                    brand: product.brand,
                    model: product.model,
                    price: product.price,
                    stock: product.stock,
                    barcode: product.barcode,
                    categoryId: product.categoryId,
                });
            } else {
                form.reset({
                    name: '',
                    brand: '',
                    model: '',
                    price: 0,
                    stock: 0,
                    barcode: '',
                    categoryId: undefined,
                });
            }
        }
    }, [open, product, form]);

    const onSubmit = async (values: ProductFormValues) => {
        try {
            if (product) {
                await api.put(`/products/${product.id}`, values);
                toast.success('Product updated successfully');
            } else {
                await api.post('/products', values);
                toast.success('Product created successfully');
            }
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error(error);
            const data = error.response?.data;
            if (data) {
                // 1. Conflict Errors (409) - e.g., "Barcode already exists"
                if (error.response.status === 409) {
                    const description = data.message || 'Product already exists.';
                    toast.error('Error', { description });
                    // Try to map to a field if possible, though conflict usually generic or specific field known
                    if (description.toLowerCase().includes('barcode')) {
                        form.setError('barcode', { message: description });
                    }
                    return;
                }

                // 2. Validation errors (400)
                const validationErrors = data.errors;
                let handled = false;
                if (Array.isArray(validationErrors)) {
                    validationErrors.forEach((err: any) => {
                        const path = err.path?.[0];
                        const message = err.message;
                        if (path && ['name', 'brand', 'model', 'price', 'stock', 'barcode', 'categoryId'].includes(path)) {
                            form.setError(path as any, { message });
                            handled = true;
                        }
                    });

                    if (handled) return;
                }

                // 3. Other errors
                if (data?.message) {
                    toast.error('Error', { description: data.message });
                } else {
                    toast.error('Something went wrong', {
                        description: 'Please try again later.',
                    });
                }
            } else {
                toast.error('Network error', {
                    description: 'Could not connect to the server.',
                });
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-visible border-none shadow-none bg-transparent">
                <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                    {/* Header */}
                    <div className="relative mx-4 -mt-6 mb-4 grid h-24 place-items-center overflow-hidden rounded-xl bg-gradient-to-tr from-gray-900 to-gray-800 bg-clip-border text-white shadow-lg shadow-gray-900/20">
                        <DialogTitle className="block font-sans text-2xl font-semibold leading-snug tracking-normal text-white antialiased">
                            {product ? 'Edit Product' : 'Add Product'}
                        </DialogTitle>
                    </div>

                    <div className="px-6 pb-6 pt-2 h-[65vh] overflow-y-auto custom-scrollbar">


                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <FormField
                                        control={form.control}
                                        name="barcode"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-gray-700 dark:text-gray-300">Barcode</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Scan or enter barcode"
                                                        maxLength={30}
                                                        className="h-11 border border-gray-300 bg-background px-3 py-3 text-sm focus:border-gray-900 focus:ring-0 dark:border-white/20 dark:focus:border-white"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-red-600" />
                                                {form.formState.errors.barcode && (
                                                    <p className="text-sm font-medium text-red-600" style={{ color: 'red' }}>
                                                        {String(form.formState.errors.barcode.message)}
                                                    </p>
                                                )}
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 dark:text-gray-300">Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Product Name"
                                                    maxLength={100}
                                                    className="h-11 border border-gray-300 bg-background px-3 py-3 text-sm focus:border-gray-900 focus:ring-0 dark:border-white/20 dark:focus:border-white"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-600" />
                                            {form.formState.errors.name && (
                                                <p className="text-sm font-medium text-red-600" style={{ color: 'red' }}>
                                                    {String(form.formState.errors.name.message)}
                                                </p>
                                            )}
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="brand"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 dark:text-gray-300">Brand</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Brand (e.g. Apple)"
                                                    maxLength={50}
                                                    className="h-11 border border-gray-300 bg-background px-3 py-3 text-sm focus:border-gray-900 focus:ring-0 dark:border-white/20 dark:focus:border-white"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-600" />
                                            {form.formState.errors.brand && (
                                                <p className="text-sm font-medium text-red-600" style={{ color: 'red' }}>
                                                    {String(form.formState.errors.brand.message)}
                                                </p>
                                            )}
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="model"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 dark:text-gray-300">Model</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Model"
                                                    maxLength={50}
                                                    className="h-11 border border-gray-300 bg-background px-3 py-3 text-sm focus:border-gray-900 focus:ring-0 dark:border-white/20 dark:focus:border-white"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-600" />
                                            {form.formState.errors.model && (
                                                <p className="text-sm font-medium text-red-600" style={{ color: 'red' }}>
                                                    {String(form.formState.errors.model.message)}
                                                </p>
                                            )}
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="categoryId"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel className="text-gray-700 dark:text-gray-300">Category</FormLabel>
                                            <Combobox
                                                options={categories.map(cat => ({ label: cat.name, value: String(cat.id) }))}
                                                value={field.value ? String(field.value) : ''}
                                                onChange={(val) => field.onChange(Number(val))}
                                                placeholder="Select Category"
                                                searchPlaceholder="Search category..."
                                                emptyText="No category found."
                                                className="w-full"
                                            />
                                            <FormMessage className="text-red-600" />
                                            {form.formState.errors.categoryId && (
                                                <p className="text-sm font-medium text-red-600" style={{ color: 'red' }}>
                                                    {String(form.formState.errors.categoryId.message)}
                                                </p>
                                            )}
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="price"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 dark:text-gray-300">Price</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="text"
                                                    placeholder="0"
                                                    value={field.value ? Number(field.value).toLocaleString() : ''}
                                                    onChange={(e) => {
                                                        const rawValue = e.target.value.replace(/,/g, '');
                                                        if (rawValue === '' || /^\d+$/.test(rawValue)) {
                                                            field.onChange(Number(rawValue));
                                                        }
                                                    }}
                                                    className="h-11 border border-gray-300 bg-background px-3 py-3 text-sm focus:border-gray-900 focus:ring-0 dark:border-white/20 dark:focus:border-white"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-600" />
                                            {form.formState.errors.price && (
                                                <p className="text-sm font-medium text-red-600" style={{ color: 'red' }}>
                                                    {String(form.formState.errors.price.message)}
                                                </p>
                                            )}
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="stock"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 dark:text-gray-300">Stock</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="0"
                                                    max={10000}
                                                    className="h-11 border border-gray-300 bg-background px-3 py-3 text-sm focus:border-gray-900 focus:ring-0 dark:border-white/20 dark:focus:border-white"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-600" />
                                            {form.formState.errors.stock && (
                                                <p className="text-sm font-medium text-red-600" style={{ color: 'red' }}>
                                                    {String(form.formState.errors.stock.message)}
                                                </p>
                                            )}
                                        </FormItem>
                                    )}
                                />

                                <div className="col-span-2 pt-4">
                                    <Button
                                        type="submit"
                                        disabled={form.formState.isSubmitting}
                                        className="w-full bg-gray-900 hover:bg-gray-800 text-white h-11 text-xs font-bold uppercase tracking-wider shadow-md transition-all hover:shadow-lg dark:bg-white dark:text-gray-900"
                                    >
                                        {form.formState.isSubmitting && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        {product ? 'Save Changes' : 'Create Product'}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
