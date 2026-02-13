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
    items: z.array(itemSchema).min(1, 'At least one item required'),
});

interface PurchaseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

const PAYMENT_METHODS = [
    { value: 'CASH', label: 'Cash' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'KPAY', label: 'KPay' },
    { value: 'WAVE_PAY', label: 'Wave Pay' },
    { value: 'OTHER', label: 'Other' },
];

export function PurchaseDialog({ open, onOpenChange, onSuccess }: PurchaseDialogProps) {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    // Step 2 state
    const [step, setStep] = useState<1 | 2>(1);
    const [pendingData, setPendingData] = useState<any>(null);
    const [reduceAmount, setReduceAmount] = useState(0);
    const [paymentType, setPaymentType] = useState<'FULLY' | 'PARTIALLY'>('FULLY');
    const [payAmount, setPayAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [additionalExpenses, setAdditionalExpenses] = useState<{ label: string; amount: number }[]>([]);
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const form = useForm<z.infer<typeof purchaseSchema>>({
        resolver: zodResolver(purchaseSchema),
        defaultValues: {
            supplierId: '',
            items: [{ productId: '', quantity: 1, unitCost: 0 }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'items',
    });

    const watchItems = form.watch('items');
    const itemsTotal = watchItems.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const cost = Number(item.unitCost) || 0;
        return sum + qty * cost;
    }, 0);

    useEffect(() => {
        if (open) {
            setStep(1);
            setPendingData(null);
            setReduceAmount(0);
            setPaymentType('FULLY');
            setPayAmount(0);
            setPaymentMethod('CASH');
            setAdditionalExpenses([]);
            setNote('');
            form.reset({
                supplierId: '',
                items: [{ productId: '', quantity: 1, unitCost: 0 }],
            });

            api.get('/suppliers?limit=100').then(r => setSuppliers(r.data.data || [])).catch(() => { });
            api.get('/products?limit=100').then(r => setProducts(r.data.data || [])).catch(() => { });
        }
    }, [open]);

    const formatPrice = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });

    // Step 1 → Step 2
    const onStep1Submit = (values: z.infer<typeof purchaseSchema>) => {
        setPendingData(values);
        setPayAmount(itemsTotal);
        setStep(2);
    };

    // Additional expenses total
    const addExpTotal = additionalExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    // Net total after reduce + additional expenses
    const netTotal = itemsTotal - reduceAmount + addExpTotal;
    // Credit amount
    const creditAmount = paymentType === 'FULLY' ? 0 : Math.max(0, netTotal - payAmount);

    // Step 2 final submit
    const onFinalSubmit = async () => {
        if (!pendingData) return;
        setSubmitting(true);
        try {
            const finalPayAmount = paymentType === 'FULLY' ? netTotal : payAmount;
            await api.post('/purchases', {
                supplierId: parseInt(pendingData.supplierId),
                totalAmount: itemsTotal,
                reduceAmount,
                paidAmount: finalPayAmount,
                creditAmount: paymentType === 'FULLY' ? 0 : Math.max(0, netTotal - payAmount),
                paymentMethod,
                additionalExpenses: additionalExpenses.filter(e => e.label && e.amount > 0),
                note: note || '',
                items: pendingData.items.map((i: any) => ({
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
        setSubmitting(false);
    };

    return (
        <>
            {/* Step 1: Items Dialog */}
            <Dialog open={open && step === 1} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[700px] p-0 overflow-visible border-none shadow-none bg-transparent max-h-[90vh]">
                    <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                        <div className="relative mx-4 -mt-6 mb-4 grid h-24 place-items-center overflow-hidden rounded-xl bg-gradient-to-tr from-gray-900 to-gray-800 bg-clip-border text-white shadow-lg shadow-gray-900/20">
                            <DialogTitle className="block font-sans text-2xl font-semibold leading-snug tracking-normal text-white antialiased">
                                New Purchase
                            </DialogTitle>
                        </div>

                        <div className="px-6 pb-6 pt-2 max-h-[calc(90vh-120px)] overflow-y-auto">
                            <DialogDescription className="mb-4 block font-sans text-sm font-normal leading-relaxed text-gray-500 antialiased dark:text-gray-400 text-center">
                                Step 1: Select supplier and add items
                            </DialogDescription>

                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onStep1Submit)} className="flex flex-col gap-4">
                                    {/* Supplier */}
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

                                    {/* Items */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <FormLabel className="text-gray-700 dark:text-gray-300 text-sm font-semibold">Items</FormLabel>
                                            <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: '', quantity: 1, unitCost: 0 })}>
                                                <Plus className="h-3 w-3 mr-1" /> Add Item
                                            </Button>
                                        </div>

                                        <div className="space-y-2">
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
                                                <span className="text-lg font-bold text-gray-900 dark:text-white">{formatPrice(itemsTotal)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <Button
                                            type="submit"
                                            className="w-full bg-gray-900 hover:bg-gray-800 text-white h-11 text-xs font-bold uppercase tracking-wider shadow-md transition-all hover:shadow-lg dark:bg-white dark:text-gray-900"
                                        >
                                            Continue to Payment
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Step 2: Payment Confirmation Dialog */}
            <Dialog open={open && step === 2} onOpenChange={(v) => { if (!v) { setStep(1); } }}>
                <DialogContent className="sm:max-w-[550px] p-0 overflow-visible border-none shadow-none bg-transparent max-h-[90vh]">
                    <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                        <div className="relative mx-4 -mt-6 mb-4 grid h-20 place-items-center overflow-hidden rounded-xl bg-gradient-to-tr from-green-700 to-green-500 bg-clip-border text-white shadow-lg shadow-green-500/20">
                            <DialogTitle className="text-xl font-semibold text-white">Payment Confirmation</DialogTitle>
                        </div>

                        <div className="px-6 pb-6 pt-2 max-h-[calc(90vh-120px)] overflow-y-auto space-y-4">
                            <DialogDescription className="sr-only">Confirm payment details</DialogDescription>

                            {/* Total Amount (readonly) */}
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-center">
                                <p className="text-xs text-gray-500 uppercase font-bold">Items Total</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(itemsTotal)}</p>
                            </div>

                            {/* Reduce Amount */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Reduce Amount</label>
                                <Input type="number" min={0} max={itemsTotal} className="h-10 mt-1" value={reduceAmount} onChange={(e) => setReduceAmount(Number(e.target.value) || 0)} />
                            </div>

                            {/* Additional Expenses */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Additional Expenses</label>
                                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs"
                                        onClick={() => setAdditionalExpenses([...additionalExpenses, { label: '', amount: 0 }])}>
                                        <Plus className="h-3 w-3 mr-1" /> Add
                                    </Button>
                                </div>
                                {additionalExpenses.length > 0 && (
                                    <div className="space-y-2">
                                        {additionalExpenses.map((exp, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <Input placeholder="e.g. ကားခ" className="h-9 text-xs flex-1" value={exp.label}
                                                    onChange={(e) => { const arr = [...additionalExpenses]; arr[idx].label = e.target.value; setAdditionalExpenses(arr); }} />
                                                <Input type="number" min={0} className="h-9 text-xs w-28" value={exp.amount}
                                                    onChange={(e) => { const arr = [...additionalExpenses]; arr[idx].amount = Number(e.target.value) || 0; setAdditionalExpenses(arr); }} />
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500"
                                                    onClick={() => setAdditionalExpenses(additionalExpenses.filter((_, i) => i !== idx))}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                        <div className="text-right text-xs text-gray-500">
                                            Expenses Total: <strong className="text-orange-600">{formatPrice(addExpTotal)}</strong>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Net Total */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 flex justify-between items-center">
                                <span className="text-sm font-medium">Net Total</span>
                                <span className="text-lg font-bold text-blue-700 dark:text-blue-400">{formatPrice(netTotal)}</span>
                            </div>

                            {/* Payment Type */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Payment Type</label>
                                <div className="flex gap-2">
                                    <Button type="button" variant={paymentType === 'FULLY' ? 'default' : 'outline'} size="sm"
                                        className={`flex-1 h-10 text-sm ${paymentType === 'FULLY' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                                        onClick={() => { setPaymentType('FULLY'); setPayAmount(netTotal); }}>
                                        Fully Paid
                                    </Button>
                                    <Button type="button" variant={paymentType === 'PARTIALLY' ? 'default' : 'outline'} size="sm"
                                        className={`flex-1 h-10 text-sm ${paymentType === 'PARTIALLY' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
                                        onClick={() => { setPaymentType('PARTIALLY'); setPayAmount(0); }}>
                                        Partially Paid
                                    </Button>
                                </div>
                            </div>

                            {/* Pay Amount */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Pay Amount</label>
                                    <Input type="number" min={0} max={netTotal} className="h-10 mt-1"
                                        value={paymentType === 'FULLY' ? netTotal : payAmount}
                                        disabled={paymentType === 'FULLY'}
                                        onChange={(e) => setPayAmount(Math.min(Number(e.target.value) || 0, netTotal))} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Credit Amount</label>
                                    <Input type="number" className="h-10 mt-1 bg-gray-50 dark:bg-gray-800/50" value={creditAmount} disabled readOnly />
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Payment Method</label>
                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Note */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Note</label>
                                <Textarea rows={2} className="resize-none text-sm" value={note} onChange={(e) => setNote(e.target.value)} />
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2 pt-2">
                                <Button type="button" variant="outline" className="flex-1 h-10" onClick={() => setStep(1)}>
                                    ← Back
                                </Button>
                                <Button type="button" disabled={submitting} className="flex-1 bg-green-600 hover:bg-green-700 text-white h-10 text-xs font-bold uppercase"
                                    onClick={onFinalSubmit}>
                                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Purchase
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
