'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Plus, Trash2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import api from '@/lib/axios';

const itemSchema = z.object({
    productId: z.string().min(1, 'Product required'),
    quantity: z.coerce.number().int().positive('Qty > 0'),
    unitCost: z.coerce.number().positive('Cost > 0'),
});

const purchaseSchema = z.object({
    supplierId: z.string().min(1, 'Supplier is required'),
    paidAmount: z.coerce.number().min(0).optional(),
    note: z.string().optional(),
    items: z.array(itemSchema).min(1, 'At least one item required'),
});

interface PurchaseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function PurchaseDialog({ open, onOpenChange, onSuccess }: PurchaseDialogProps) {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    const form = useForm<z.infer<typeof purchaseSchema>>({
        resolver: zodResolver(purchaseSchema),
        defaultValues: {
            supplierId: '',
            paidAmount: 0,
            note: '',
            items: [{ productId: '', quantity: 1, unitCost: 0 }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'items',
    });

    const watchItems = form.watch('items');
    const totalAmount = watchItems.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const cost = Number(item.unitCost) || 0;
        return sum + qty * cost;
    }, 0);

    useEffect(() => {
        if (open) {
            form.reset({
                supplierId: '',
                paidAmount: 0,
                note: '',
                items: [{ productId: '', quantity: 1, unitCost: 0 }],
            });

            api.get('/suppliers?limit=100').then(r => setSuppliers(r.data.data || [])).catch(() => { });
            api.get('/products?limit=100').then(r => setProducts(r.data.data || [])).catch(() => { });
        }
    }, [open]);

    const formatPrice = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });

    const onSubmit = async (values: z.infer<typeof purchaseSchema>) => {
        try {
            await api.post('/purchases', {
                supplierId: parseInt(values.supplierId),
                totalAmount,
                paidAmount: values.paidAmount || 0,
                note: values.note || '',
                items: values.items.map(i => ({
                    productId: parseInt(i.productId),
                    quantity: i.quantity,
                    unitCost: i.unitCost,
                })),
            });
            toast.success('Purchase created successfully');
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Something went wrong');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] p-0 overflow-visible border-none shadow-none bg-transparent max-h-[90vh]">
                <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                    <div className="relative mx-4 -mt-6 mb-4 grid h-24 place-items-center overflow-hidden rounded-xl bg-gradient-to-tr from-gray-900 to-gray-800 bg-clip-border text-white shadow-lg shadow-gray-900/20">
                        <DialogTitle className="block font-sans text-2xl font-semibold leading-snug tracking-normal text-white antialiased">
                            New Purchase
                        </DialogTitle>
                    </div>

                    <div className="px-6 pb-6 pt-2 max-h-[calc(90vh-120px)] overflow-y-auto">
                        <DialogDescription className="mb-4 block font-sans text-sm font-normal leading-relaxed text-gray-500 antialiased dark:text-gray-400 text-center">
                            Create a new purchase order from a supplier.
                        </DialogDescription>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                                {/* Supplier + Paid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="supplierId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-gray-700 dark:text-gray-300">Supplier *</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-11 border border-gray-300 bg-background text-sm dark:border-white/20">
                                                            <SelectValue placeholder="Select supplier" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="max-h-60">
                                                        {suppliers.map(s => (
                                                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage className="text-red-600 text-sm" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="paidAmount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-gray-700 dark:text-gray-300">Paid Amount</FormLabel>
                                                <FormControl>
                                                    <Input type="number" min={0} className="h-11 border border-gray-300 bg-background text-sm dark:border-white/20" {...field} />
                                                </FormControl>
                                                <FormMessage className="text-red-600 text-sm" />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Items */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <FormLabel className="text-gray-700 dark:text-gray-300 text-sm font-semibold">Items</FormLabel>
                                        <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: '', quantity: 1, unitCost: 0 })}>
                                            <Plus className="h-3 w-3 mr-1" /> Add Item
                                        </Button>
                                    </div>

                                    <div className="space-y-2">
                                        {/* Table Header */}
                                        <div className="grid grid-cols-[1fr_80px_100px_32px] gap-2 text-xs font-bold uppercase text-gray-400 px-1">
                                            <span>Product</span>
                                            <span>Qty</span>
                                            <span>Unit Cost</span>
                                            <span></span>
                                        </div>

                                        {fields.map((field, index) => (
                                            <div key={field.id} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-start">
                                                <FormField
                                                    control={form.control}
                                                    name={`items.${index}.productId`}
                                                    render={({ field: f }) => (
                                                        <FormItem>
                                                            <Select onValueChange={f.onChange} value={f.value}>
                                                                <FormControl>
                                                                    <SelectTrigger className="h-9 text-xs border-gray-300 dark:border-white/20">
                                                                        <SelectValue placeholder="Select" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent className="max-h-48">
                                                                    {products.map(p => (
                                                                        <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                                                                            {p.name} ({p.barcode})
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage className="text-red-600 text-[10px]" />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`items.${index}.quantity`}
                                                    render={({ field: f }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <Input type="number" min={1} className="h-9 text-xs border-gray-300 dark:border-white/20" {...f} />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`items.${index}.unitCost`}
                                                    render={({ field: f }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <Input type="number" min={0} className="h-9 text-xs border-gray-300 dark:border-white/20" {...f} />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                                <Button type="button" variant="ghost" size="icon" className="h-9 w-8 text-red-500 hover:text-red-700" onClick={() => fields.length > 1 && remove(index)} disabled={fields.length <= 1}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Total */}
                                    <div className="mt-3 flex justify-end">
                                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-4 py-2 text-right">
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Total: </span>
                                            <span className="text-lg font-bold text-gray-900 dark:text-white">{formatPrice(totalAmount)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Note */}
                                <FormField
                                    control={form.control}
                                    name="note"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 dark:text-gray-300">Note</FormLabel>
                                            <FormControl>
                                                <Textarea rows={2} className="border border-gray-300 bg-background text-sm dark:border-white/20 resize-none" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <div className="pt-2">
                                    <Button
                                        type="submit"
                                        disabled={form.formState.isSubmitting}
                                        className="w-full bg-gray-900 hover:bg-gray-800 text-white h-11 text-xs font-bold uppercase tracking-wider shadow-md transition-all hover:shadow-lg dark:bg-white dark:text-gray-900"
                                    >
                                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Create Purchase
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
