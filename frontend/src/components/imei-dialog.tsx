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
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/axios';

const singleSchema = z.object({
    mode: z.literal('single'),
    imei: z.string().min(15, 'IMEI must be at least 15 characters').max(20),
    productId: z.string().min(1, 'Product is required'),
    status: z.enum(['IN_STOCK', 'SOLD', 'RESERVED', 'DEFECTIVE', 'TRADED_IN', 'TRANSFERRED']),
});

const bulkSchema = z.object({
    mode: z.literal('bulk'),
    imeis: z.string().min(15, 'Enter at least one IMEI'),
    productId: z.string().min(1, 'Product is required'),
});

const editSchema = z.object({
    mode: z.literal('edit'),
    imei: z.string().min(15).max(20),
    productId: z.string().min(1, 'Product is required'),
    status: z.enum(['IN_STOCK', 'SOLD', 'RESERVED', 'DEFECTIVE', 'TRADED_IN', 'TRANSFERRED']),
});

interface IMEIDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    imeiRecord?: any;
    onSuccess: () => void;
}

const STATUS_OPTIONS = [
    { value: 'IN_STOCK', label: 'In Stock' },
    { value: 'SOLD', label: 'Sold' },
    { value: 'RESERVED', label: 'Reserved' },
    { value: 'DEFECTIVE', label: 'Defective' },
    { value: 'TRADED_IN', label: 'Traded In' },
    { value: 'TRANSFERRED', label: 'Transferred' },
];

export function IMEIDialog({ open, onOpenChange, imeiRecord, onSuccess }: IMEIDialogProps) {
    const isEdit = !!imeiRecord;
    const [mode, setMode] = useState<'single' | 'bulk'>('single');
    const [products, setProducts] = useState<any[]>([]);

    const form = useForm<any>({
        resolver: zodResolver(isEdit ? editSchema : mode === 'single' ? singleSchema : bulkSchema),
        defaultValues: {
            mode: isEdit ? 'edit' : 'single',
            imei: '',
            imeis: '',
            productId: '',
            status: 'IN_STOCK',
        },
    });

    useEffect(() => {
        if (open) {
            // Fetch products for dropdown
            api.get('/products?limit=100').then(res => {
                setProducts(res.data.data || []);
            }).catch(() => { });

            if (imeiRecord) {
                setMode('single');
                form.reset({
                    mode: 'edit',
                    imei: imeiRecord.imei,
                    productId: String(imeiRecord.productId),
                    status: imeiRecord.status,
                });
            } else {
                form.reset({
                    mode: mode,
                    imei: '',
                    imeis: '',
                    productId: '',
                    status: 'IN_STOCK',
                });
            }
        }
    }, [open, imeiRecord]);

    useEffect(() => {
        if (!isEdit && open) {
            form.setValue('mode', mode);
        }
    }, [mode]);

    const onSubmit = async (values: any) => {
        try {
            if (isEdit) {
                await api.put(`/imeis/${imeiRecord.id}`, {
                    imei: values.imei,
                    productId: parseInt(values.productId),
                    status: values.status,
                });
                toast.success('IMEI updated successfully');
            } else if (mode === 'bulk') {
                const imeiList = values.imeis
                    .split('\n')
                    .map((s: string) => s.trim())
                    .filter((s: string) => s.length >= 15);

                if (imeiList.length === 0) {
                    toast.error('No valid IMEIs found');
                    return;
                }

                const res = await api.post('/imeis/bulk', {
                    productId: parseInt(values.productId),
                    imeis: imeiList,
                });
                toast.success(res.data.message);
            } else {
                await api.post('/imeis', {
                    imei: values.imei,
                    productId: parseInt(values.productId),
                    status: values.status,
                });
                toast.success('IMEI added successfully');
            }
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error(error);
            if (error.response?.status === 409) {
                toast.error(error.response.data.message || 'Duplicate IMEI');
            } else if (error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('Something went wrong');
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[540px] p-0 overflow-visible border-none shadow-none bg-transparent">
                <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                    <div className="relative mx-4 -mt-6 mb-4 grid h-24 place-items-center overflow-hidden rounded-xl bg-gradient-to-tr from-gray-900 to-gray-800 bg-clip-border text-white shadow-lg shadow-gray-900/20">
                        <DialogTitle className="block font-sans text-2xl font-semibold leading-snug tracking-normal text-white antialiased">
                            {isEdit ? 'Edit IMEI' : 'Add IMEI'}
                        </DialogTitle>
                    </div>

                    <div className="px-6 pb-6 pt-2">
                        <DialogDescription className="mb-4 block font-sans text-sm font-normal leading-relaxed text-gray-500 antialiased dark:text-gray-400 text-center">
                            {isEdit ? 'Update IMEI details below.' : 'Add one or multiple IMEIs to a product.'}
                        </DialogDescription>

                        {/* Mode Toggle (only for create) */}
                        {!isEdit && (
                            <div className="flex gap-2 mb-4">
                                <Button
                                    type="button" variant={mode === 'single' ? 'default' : 'outline'} size="sm"
                                    className={mode === 'single' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : ''}
                                    onClick={() => setMode('single')}
                                >
                                    Single
                                </Button>
                                <Button
                                    type="button" variant={mode === 'bulk' ? 'default' : 'outline'} size="sm"
                                    className={mode === 'bulk' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : ''}
                                    onClick={() => setMode('bulk')}
                                >
                                    Bulk Import
                                </Button>
                            </div>
                        )}

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                                {/* Product Select */}
                                <FormField
                                    control={form.control}
                                    name="productId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 dark:text-gray-300">Product *</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-11 border border-gray-300 bg-background px-3 py-3 text-sm focus:border-gray-900 focus:ring-0 dark:border-white/20 dark:focus:border-white">
                                                        <SelectValue placeholder="Select a product" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="max-h-60">
                                                    {products.map((p) => (
                                                        <SelectItem key={p.id} value={String(p.id)}>
                                                            {p.name} — {p.brand} ({p.barcode})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage className="text-red-600 text-sm" />
                                        </FormItem>
                                    )}
                                />

                                {/* Single IMEI */}
                                {(isEdit || mode === 'single') && (
                                    <>
                                        <FormField
                                            control={form.control}
                                            name="imei"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-gray-700 dark:text-gray-300">IMEI *</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            maxLength={20}
                                                            placeholder="e.g. 353456789012345"
                                                            className="h-11 border border-gray-300 bg-background px-3 py-3 text-sm focus:border-gray-900 focus:ring-0 dark:border-white/20 dark:focus:border-white"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage className="text-red-600 text-sm" />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="status"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-gray-700 dark:text-gray-300">Status</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-11 border border-gray-300 bg-background px-3 py-3 text-sm focus:border-gray-900 focus:ring-0 dark:border-white/20 dark:focus:border-white">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {STATUS_OPTIONS.map((s) => (
                                                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage className="text-red-600 text-sm" />
                                                </FormItem>
                                            )}
                                        />
                                    </>
                                )}

                                {/* Bulk IMEIs */}
                                {!isEdit && mode === 'bulk' && (
                                    <FormField
                                        control={form.control}
                                        name="imeis"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-gray-700 dark:text-gray-300">IMEIs (one per line) *</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        rows={6}
                                                        placeholder={"353456789012345\n353456789012346\n353456789012347"}
                                                        className="border border-gray-300 bg-background px-3 py-3 text-sm focus:border-gray-900 focus:ring-0 dark:border-white/20 dark:focus:border-white font-mono text-xs"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-red-600 text-sm" />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                <div className="pt-4">
                                    <Button
                                        type="submit"
                                        disabled={form.formState.isSubmitting}
                                        className="w-full bg-gray-900 hover:bg-gray-800 text-white h-11 text-xs font-bold uppercase tracking-wider shadow-md transition-all hover:shadow-lg dark:bg-white dark:text-gray-900"
                                    >
                                        {form.formState.isSubmitting && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        {isEdit ? 'Save Changes' : mode === 'bulk' ? 'Import IMEIs' : 'Add IMEI'}
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
