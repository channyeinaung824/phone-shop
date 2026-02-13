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
    unitPrice: z.coerce.number().positive('Price > 0'),
    discount: z.coerce.number().min(0).optional(),
});

const saleSchema = z.object({
    customerId: z.string().optional(),
    discount: z.coerce.number().min(0).optional(),
    tax: z.coerce.number().min(0).optional(),
    paidAmount: z.coerce.number().min(0, 'Paid amount required'),
    paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'KPAY', 'WAVE_PAY', 'INSTALLMENT', 'OTHER']),
    note: z.string().optional(),
    items: z.array(itemSchema).min(1, 'At least one item required'),
});

const PAYMENT_METHODS = [
    { value: 'CASH', label: 'Cash' },
    { value: 'KPAY', label: 'KPay' },
    { value: 'WAVE_PAY', label: 'Wave Pay' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'INSTALLMENT', label: 'Installment' },
    { value: 'OTHER', label: 'Other' },
];

interface SaleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function SaleDialog({ open, onOpenChange, onSuccess }: SaleDialogProps) {
    const [customers, setCustomers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    const form = useForm<z.infer<typeof saleSchema>>({
        resolver: zodResolver(saleSchema),
        defaultValues: {
            customerId: '',
            discount: 0,
            tax: 0,
            paidAmount: 0,
            paymentMethod: 'CASH',
            note: '',
            items: [{ productId: '', quantity: 1, unitPrice: 0, discount: 0 }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'items',
    });

    const watchItems = form.watch('items');
    const watchDiscount = Number(form.watch('discount')) || 0;
    const watchTax = Number(form.watch('tax')) || 0;

    const subtotal = watchItems.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || 0;
        const disc = Number(item.discount) || 0;
        return sum + (qty * price - disc);
    }, 0);

    const totalAmount = subtotal - watchDiscount + watchTax;
    const paidAmount = Number(form.watch('paidAmount')) || 0;
    const changeAmount = Math.max(0, paidAmount - totalAmount);

    useEffect(() => {
        if (open) {
            form.reset({
                customerId: '',
                discount: 0,
                tax: 0,
                paidAmount: 0,
                paymentMethod: 'CASH',
                note: '',
                items: [{ productId: '', quantity: 1, unitPrice: 0, discount: 0 }],
            });

            api.get('/customers?limit=100').then(r => setCustomers(r.data.data || [])).catch(() => { });
            api.get('/products?limit=100').then(r => setProducts(r.data.data || [])).catch(() => { });
        }
    }, [open]);

    // Auto-fill price when product is selected
    const handleProductChange = (index: number, productId: string) => {
        form.setValue(`items.${index}.productId`, productId);
        const product = products.find(p => String(p.id) === productId);
        if (product) {
            form.setValue(`items.${index}.unitPrice`, Number(product.price));
        }
    };

    const formatPrice = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });

    const onSubmit = async (values: z.infer<typeof saleSchema>) => {
        try {
            await api.post('/sales', {
                customerId: values.customerId ? parseInt(values.customerId) : undefined,
                subtotal,
                discount: values.discount || 0,
                tax: values.tax || 0,
                totalAmount,
                paidAmount: values.paidAmount,
                changeAmount,
                paymentMethod: values.paymentMethod,
                note: values.note || '',
                items: values.items.map(i => ({
                    productId: parseInt(i.productId),
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                    discount: i.discount || 0,
                })),
            });
            toast.success('Sale completed!');
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Something went wrong');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[750px] p-0 overflow-visible border-none shadow-none bg-transparent max-h-[90vh]">
                <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                    <div className="relative mx-4 -mt-6 mb-4 grid h-24 place-items-center overflow-hidden rounded-xl bg-gradient-to-tr from-gray-900 to-gray-800 bg-clip-border text-white shadow-lg shadow-gray-900/20">
                        <DialogTitle className="block font-sans text-2xl font-semibold leading-snug tracking-normal text-white antialiased">
                            New Sale
                        </DialogTitle>
                    </div>

                    <div className="px-6 pb-6 pt-2 max-h-[calc(90vh-120px)] overflow-y-auto">
                        <DialogDescription className="mb-4 block font-sans text-sm font-normal leading-relaxed text-gray-500 antialiased dark:text-gray-400 text-center">
                            Create a new sale transaction.
                        </DialogDescription>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                                {/* Customer + Payment Method */}
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="customerId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-gray-700 dark:text-gray-300">Customer (optional)</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-11 border border-gray-300 bg-background text-sm dark:border-white/20">
                                                            <SelectValue placeholder="Walk-in customer" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="max-h-60">
                                                        {customers.map(c => (
                                                            <SelectItem key={c.id} value={String(c.id)}>
                                                                {c.name} ({c.phone})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="paymentMethod"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-gray-700 dark:text-gray-300">Payment Method *</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-11 border border-gray-300 bg-background text-sm dark:border-white/20">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {PAYMENT_METHODS.map(pm => (
                                                            <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage className="text-red-600 text-sm" />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Items */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <FormLabel className="text-gray-700 dark:text-gray-300 text-sm font-semibold">Items</FormLabel>
                                        <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: '', quantity: 1, unitPrice: 0, discount: 0 })}>
                                            <Plus className="h-3 w-3 mr-1" /> Add Item
                                        </Button>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="grid grid-cols-[1fr_60px_90px_70px_32px] gap-2 text-xs font-bold uppercase text-gray-400 px-1">
                                            <span>Product</span>
                                            <span>Qty</span>
                                            <span>Price</span>
                                            <span>Disc.</span>
                                            <span></span>
                                        </div>

                                        {fields.map((field, index) => (
                                            <div key={field.id} className="grid grid-cols-[1fr_60px_90px_70px_32px] gap-2 items-start">
                                                <FormField
                                                    control={form.control}
                                                    name={`items.${index}.productId`}
                                                    render={({ field: f }) => (
                                                        <FormItem>
                                                            <Select onValueChange={(val) => handleProductChange(index, val)} value={f.value}>
                                                                <FormControl>
                                                                    <SelectTrigger className="h-9 text-xs border-gray-300 dark:border-white/20">
                                                                        <SelectValue placeholder="Select" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent className="max-h-48">
                                                                    {products.map(p => (
                                                                        <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                                                                            {p.name} — Stock: {p.stock}
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
                                                    name={`items.${index}.unitPrice`}
                                                    render={({ field: f }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <Input type="number" min={0} className="h-9 text-xs border-gray-300 dark:border-white/20" {...f} />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`items.${index}.discount`}
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
                                </div>

                                {/* Discount, Tax, Paid */}
                                <div className="grid grid-cols-3 gap-3">
                                    <FormField
                                        control={form.control}
                                        name="discount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-gray-700 dark:text-gray-300 text-xs">Overall Discount</FormLabel>
                                                <FormControl>
                                                    <Input type="number" min={0} className="h-9 text-sm border-gray-300 dark:border-white/20" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="tax"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-gray-700 dark:text-gray-300 text-xs">Tax</FormLabel>
                                                <FormControl>
                                                    <Input type="number" min={0} className="h-9 text-sm border-gray-300 dark:border-white/20" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="paidAmount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-gray-700 dark:text-gray-300 text-xs">Paid Amount *</FormLabel>
                                                <FormControl>
                                                    <Input type="number" min={0} className="h-9 text-sm border-gray-300 dark:border-white/20" {...field} />
                                                </FormControl>
                                                <FormMessage className="text-red-600 text-sm" />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Summary */}
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-1">
                                    <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                                        <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
                                    </div>
                                    {watchDiscount > 0 && (
                                        <div className="flex justify-between text-sm text-red-500">
                                            <span>Discount</span><span>-{formatPrice(watchDiscount)}</span>
                                        </div>
                                    )}
                                    {watchTax > 0 && (
                                        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                                            <span>Tax</span><span>+{formatPrice(watchTax)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-1">
                                        <span>Total</span><span>{formatPrice(totalAmount)}</span>
                                    </div>
                                    {changeAmount > 0 && (
                                        <div className="flex justify-between text-sm font-medium text-green-600 dark:text-green-400">
                                            <span>Change</span><span>{formatPrice(changeAmount)}</span>
                                        </div>
                                    )}
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
                                        className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-sm font-bold uppercase tracking-wider shadow-md transition-all hover:shadow-lg"
                                    >
                                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Complete Sale — {formatPrice(totalAmount)}
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
