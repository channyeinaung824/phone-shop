'use client';

import { useEffect, useState, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Plus, Trash2, Download, Upload, Check, ChevronsUpDown } from 'lucide-react';
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
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

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });

// ─── Product Combobox ─────────────────────────────────
function ProductCombobox({ products, value, onChange }: { products: any[]; value: string; onChange: (v: string) => void }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const selected = products.find(p => String(p.id) === value);

    const filtered = search
        ? products.filter(p => {
            const s = search.toLowerCase();
            return p.name?.toLowerCase().includes(s) || p.barcode?.toLowerCase().includes(s) || p.brand?.toLowerCase().includes(s);
        })
        : products;

    const handleSelect = (id: number) => {
        onChange(String(id));
        setOpen(false);
        setSearch('');
    };

    return (
        <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(''); }}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open}
                    className="h-9 w-full justify-between text-xs border-gray-300 dark:border-white/20 font-normal truncate hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <span className="truncate">
                        {selected ? `${selected.name} (${selected.barcode})` : <span className="text-muted-foreground">Select product...</span>}
                    </span>
                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0 shadow-xl border-none bg-white dark:bg-[#1a1f2e] z-[9999] rounded-lg" align="start" sideOffset={4}>
                <div className="flex flex-col">
                    <div className="flex items-center border-b px-3 py-2">
                        <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-40" />
                        <input
                            className="flex h-8 w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                            placeholder="Search by name, barcode, brand..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && filtered.length > 0) {
                                    e.preventDefault();
                                    handleSelect(filtered[0].id);
                                }
                            }}
                            autoFocus
                        />
                    </div>
                    <div className="max-h-[220px] overflow-y-auto overscroll-contain py-1" onWheel={(e) => e.stopPropagation()}>
                        {filtered.length === 0 ? (
                            <p className="py-4 text-center text-xs text-muted-foreground">No product found.</p>
                        ) : (
                            filtered.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => handleSelect(p.id)}
                                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-xs transition-colors hover:bg-accent hover:text-accent-foreground ${value === String(p.id) ? 'bg-accent/50' : ''}`}
                                >
                                    <Check className={`h-3.5 w-3.5 shrink-0 ${value === String(p.id) ? 'text-green-600 opacity-100' : 'opacity-0'}`} />
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-medium truncate">{p.name}</span>
                                        <span className="text-[10px] text-muted-foreground">{p.brand} · {p.barcode}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

// ─── Supplier Combobox ────────────────────────────────
function SupplierCombobox({ suppliers, value, onChange }: { suppliers: any[]; value: string; onChange: (v: string) => void }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const selected = suppliers.find(s => String(s.id) === value);

    const filtered = search
        ? suppliers.filter(s => {
            const q = search.toLowerCase();
            return s.name?.toLowerCase().includes(q) || s.phone?.toLowerCase().includes(q);
        })
        : suppliers;

    const handleSelect = (id: number) => {
        onChange(String(id));
        setOpen(false);
        setSearch('');
    };

    return (
        <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(''); }}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open}
                    className="h-11 w-full justify-between border-gray-300 dark:border-white/20 font-normal text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <span className="truncate">
                        {selected ? selected.name : <span className="text-muted-foreground">Select supplier...</span>}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0 shadow-xl border-none bg-white dark:bg-[#1a1f2e] z-[9999] rounded-lg" align="start" sideOffset={4}>
                <div className="flex flex-col">
                    <div className="flex items-center border-b px-3 py-2">
                        <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-40" />
                        <input
                            className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            placeholder="Search by name or phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && filtered.length > 0) {
                                    e.preventDefault();
                                    handleSelect(filtered[0].id);
                                }
                            }}
                            autoFocus
                        />
                    </div>
                    <div className="max-h-[220px] overflow-y-auto overscroll-contain py-1" onWheel={(e) => e.stopPropagation()}>
                        {filtered.length === 0 ? (
                            <p className="py-4 text-center text-sm text-muted-foreground">No supplier found.</p>
                        ) : (
                            filtered.map(s => (
                                <div
                                    key={s.id}
                                    onClick={() => handleSelect(s.id)}
                                    className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground ${value === String(s.id) ? 'bg-accent/50' : ''}`}
                                >
                                    <Check className={`h-4 w-4 shrink-0 ${value === String(s.id) ? 'text-green-600 opacity-100' : 'opacity-0'}`} />
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-medium text-sm truncate">{s.name}</span>
                                        {s.phone && <span className="text-xs text-muted-foreground">{s.phone}</span>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}


export function PurchaseDialog({ open, onOpenChange, onSuccess }: PurchaseDialogProps) {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);

    // Step 2 state
    const [step, setStep] = useState<1 | 2>(1);
    const [pendingData, setPendingData] = useState<any>(null);
    const [reduceAmount, setReduceAmount] = useState(0);
    const [paymentType, setPaymentType] = useState<'FULLY' | 'PARTIALLY'>('FULLY');
    const [payments, setPayments] = useState<{ method: string; amount: number }[]>([{ method: 'CASH', amount: 0 }]);
    const [additionalExpenses, setAdditionalExpenses] = useState<{ label: string; amount: number }[]>([]);
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const form = useForm<z.infer<typeof purchaseSchema>>({
        resolver: zodResolver(purchaseSchema),
        defaultValues: {
            supplierId: '',
            items: [{ productId: '', quantity: 1, unitCost: '' as any }],
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
            setPayments([{ method: 'CASH', amount: 0 }]);
            setAdditionalExpenses([]);
            setNote('');
            form.reset({
                supplierId: '',
                items: [{ productId: '', quantity: 1, unitCost: '' as any }],
            });

            api.get('/suppliers?limit=200').then(r => setSuppliers(r.data.data || [])).catch(() => { });
            api.get('/products?limit=200').then(r => setProducts(r.data.data || [])).catch(() => { });
        }
    }, [open]);

    // CSV Template Download — for purchase items (Product, Qty, Unit Cost)
    const downloadTemplate = () => {
        const header = 'Product,Qty,UnitCost';
        const sample = 'iPhone 15 Pro,10,1500000';
        const csv = `${header}\n${sample}`;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'purchase_items_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    // CSV Import — parse items and add to form
    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true);
        try {
            const text = await file.text();
            const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
            if (lines.length < 2) { toast.error('CSV must have header + at least 1 row'); setImporting(false); return; }
            // Parse rows (skip header)
            const newItems: { productId: string; quantity: number; unitCost: number }[] = [];
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c => c.trim());
                if (cols.length < 3) continue;
                const [productName, qty, cost] = cols;
                // Find product by name (case-insensitive)
                const found = products.find(p => p.name?.toLowerCase() === productName.toLowerCase());
                if (found) {
                    newItems.push({ productId: String(found.id), quantity: parseInt(qty) || 1, unitCost: parseFloat(cost) || 0 });
                } else {
                    toast.error(`Product not found: ${productName}`);
                }
            }
            if (newItems.length > 0) {
                // Replace existing empty row or append
                const currentItems = form.getValues('items');
                const hasOnlyEmpty = currentItems.length === 1 && !currentItems[0].productId;
                if (hasOnlyEmpty) {
                    form.setValue('items', newItems as any);
                } else {
                    form.setValue('items', [...currentItems, ...newItems] as any);
                }
                toast.success(`Imported ${newItems.length} item(s)`);
            }
        } catch (err: any) {
            toast.error('Failed to parse CSV file');
        }
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Step 1 → Step 2
    const onStep1Submit = (values: z.infer<typeof purchaseSchema>) => {
        setPendingData(values);
        setPayments([{ method: 'CASH', amount: netTotal }]);
        setStep(2);
    };

    // Additional expenses total
    const addExpTotal = additionalExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    // Net total
    const netTotal = itemsTotal - reduceAmount + addExpTotal;
    // Total paid across all payment rows
    const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    // Credit amount
    const creditAmount = Math.max(0, netTotal - totalPaid);
    // Payment validation
    const hasNegativePayment = payments.some(p => (Number(p.amount) || 0) < 0);
    const totalExceedsNet = totalPaid > netTotal;
    const fullyPaidMismatch = paymentType === 'FULLY' && totalPaid !== netTotal;
    const paymentInvalid = hasNegativePayment || totalExceedsNet || (paymentType === 'FULLY' && totalPaid !== netTotal && payments.length === 1);
    const paymentErrorMsg = hasNegativePayment ? 'Payment amounts cannot be negative'
        : totalExceedsNet ? `Total paid (${fmt(totalPaid)}) exceeds net total (${fmt(netTotal)})`
            : (paymentType === 'FULLY' && totalPaid !== netTotal) ? `Fully paid must equal net total (${fmt(netTotal)})`
                : '';

    // Auto-sync payment amount when netTotal changes and paymentType is FULLY with single payment
    useEffect(() => {
        if (step === 2 && paymentType === 'FULLY' && payments.length === 1) {
            setPayments([{ method: payments[0]?.method || 'CASH', amount: netTotal }]);
        }
    }, [netTotal, paymentType, step]);

    // No auto-collapse — both modes support multiple payments

    // Step 2 final submit
    const onFinalSubmit = async () => {
        if (!pendingData) return;
        setSubmitting(true);
        try {
            const finalPaid = totalPaid;
            await api.post('/purchases', {
                supplierId: parseInt(pendingData.supplierId),
                totalAmount: itemsTotal,
                reduceAmount,
                paidAmount: finalPaid,
                creditAmount: creditAmount,
                paymentMethod: payments[0]?.method || 'CASH',
                additionalExpenses: [
                    ...additionalExpenses.filter(e => e.label && e.amount > 0),
                    // Store multiple payments as part of additional data
                    ...payments.map(p => ({ label: `Payment: ${p.method}`, amount: p.amount })),
                ],
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

                            {/* CSV Import/Download */}
                            <div className="flex gap-2 mb-4 justify-end">
                                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={downloadTemplate}>
                                    <Download className="h-3 w-3 mr-1" /> Format Download
                                </Button>
                                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" disabled={importing}
                                    onClick={() => fileInputRef.current?.click()}>
                                    {importing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                                    Import Products
                                </Button>
                                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImport} />
                            </div>

                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onStep1Submit)} className="flex flex-col gap-4">
                                    {/* Supplier (searchable) */}
                                    <FormField
                                        control={form.control}
                                        name="supplierId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-gray-700 dark:text-gray-300">Supplier *</FormLabel>
                                                <FormControl>
                                                    <SupplierCombobox suppliers={suppliers} value={field.value} onChange={field.onChange} />
                                                </FormControl>
                                                <FormMessage className="text-red-600 text-sm" />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Items */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <FormLabel className="text-gray-700 dark:text-gray-300 text-sm font-semibold">Items</FormLabel>
                                            <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: '', quantity: 1, unitCost: '' as any })}>
                                                <Plus className="h-3 w-3 mr-1" /> Add Item
                                            </Button>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="grid grid-cols-[1fr_80px_120px_32px] gap-2 text-xs font-bold uppercase text-gray-400 px-1">
                                                <span>Product</span>
                                                <span>Qty</span>
                                                <span>Unit Cost</span>
                                                <span></span>
                                            </div>

                                            {fields.map((field, index) => (
                                                <div key={field.id} className="grid grid-cols-[1fr_80px_120px_32px] gap-2 items-start">
                                                    <FormField
                                                        control={form.control}
                                                        name={`items.${index}.productId`}
                                                        render={({ field: f }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <ProductCombobox products={products} value={f.value} onChange={f.onChange} />
                                                                </FormControl>
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
                                                <span className="text-lg font-bold text-gray-900 dark:text-white">{fmt(itemsTotal)}</span>
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
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmt(itemsTotal)}</p>
                            </div>

                            {/* Reduce Amount */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Reduce Amount</label>
                                <Input type="number" min={0} max={itemsTotal} className="h-10 mt-1" value={reduceAmount || ''} onChange={(e) => setReduceAmount(Number(e.target.value) || 0)} />
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
                                                <Input type="number" min={0} className="h-9 text-xs w-28" value={exp.amount || ''}
                                                    onChange={(e) => { const arr = [...additionalExpenses]; arr[idx].amount = Number(e.target.value) || 0; setAdditionalExpenses(arr); }} />
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500"
                                                    onClick={() => setAdditionalExpenses(additionalExpenses.filter((_, i) => i !== idx))}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                        <div className="text-right text-xs text-gray-500">
                                            Expenses Total: <strong className="text-orange-600">{fmt(addExpTotal)}</strong>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Net Total */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 flex justify-between items-center">
                                <span className="text-sm font-medium">Net Total</span>
                                <span className="text-lg font-bold text-blue-700 dark:text-blue-400">{fmt(netTotal)}</span>
                            </div>

                            {/* Payment Type */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Payment Type</label>
                                <div className="flex gap-2">
                                    <Button type="button" variant={paymentType === 'FULLY' ? 'default' : 'outline'} size="sm"
                                        className={`flex-1 h-10 text-sm ${paymentType === 'FULLY' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                                        onClick={() => { setPaymentType('FULLY'); setPayments([{ method: payments[0]?.method || 'CASH', amount: netTotal }]); }}>
                                        Fully Paid
                                    </Button>
                                    <Button type="button" variant={paymentType === 'PARTIALLY' ? 'default' : 'outline'} size="sm"
                                        className={`flex-1 h-10 text-sm ${paymentType === 'PARTIALLY' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
                                        onClick={() => { setPaymentType('PARTIALLY'); setPayments([{ method: 'CASH', amount: 0 }]); }}>
                                        Partially Paid
                                    </Button>
                                </div>
                            </div>

                            {/* Multiple Payments */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Payments</label>
                                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs"
                                        onClick={() => setPayments([...payments, { method: 'CASH', amount: 0 }])}>
                                        <Plus className="h-3 w-3 mr-1" /> Add Payment
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {payments.map((pay, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <Select value={pay.method} onValueChange={(v) => { const arr = [...payments]; arr[idx].method = v; setPayments(arr); }}>
                                                <SelectTrigger className="h-9 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <Input type="number" min={0} className="h-9 text-xs flex-1"
                                                value={pay.amount || ''}
                                                onChange={(e) => { const arr = [...payments]; arr[idx].amount = Number(e.target.value) || 0; setPayments(arr); }} />
                                            {payments.length > 1 && (
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500"
                                                    onClick={() => setPayments(payments.filter((_, i) => i !== idx))}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    <div className="text-right text-xs text-gray-500">
                                        Total Paid: <strong className={totalExceedsNet ? 'text-red-600' : 'text-green-600'}>{fmt(totalPaid)}</strong>
                                        <span className="text-gray-400"> / {fmt(netTotal)}</span>
                                    </div>
                                    {paymentErrorMsg && (
                                        <p className="text-xs text-red-600 text-right font-medium mt-1">⚠ {paymentErrorMsg}</p>
                                    )}
                                </div>
                            </div>

                            {/* Credit Amount */}
                            {creditAmount > 0 && (
                                <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-3 flex justify-between items-center">
                                    <span className="text-sm font-medium text-red-700 dark:text-red-400">Credit Amount</span>
                                    <span className="text-lg font-bold text-red-600">{fmt(creditAmount)}</span>
                                </div>
                            )}

                            {/* Note */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Note</label>
                                <Input className="h-10 text-sm" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note..." />
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2 pt-2">
                                <Button type="button" variant="outline" className="flex-1 h-10" onClick={() => setStep(1)}>
                                    ← Back
                                </Button>
                                <Button type="button" disabled={submitting || paymentInvalid || netTotal <= 0} className="flex-1 bg-green-600 hover:bg-green-700 text-white h-10 text-xs font-bold uppercase disabled:opacity-50"
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
