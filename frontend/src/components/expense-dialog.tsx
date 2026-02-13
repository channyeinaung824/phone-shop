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
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import api from '@/lib/axios';

const expenseSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200),
    amount: z.coerce.number().positive('Amount must be positive'),
    categoryId: z.string().optional(),
    date: z.string().min(1, 'Date is required'),
    note: z.string().optional(),
});

interface ExpenseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    expense?: any;
}

export function ExpenseDialog({ open, onOpenChange, onSuccess, expense }: ExpenseDialogProps) {
    const [categories, setCategories] = useState<any[]>([]);
    const isEdit = !!expense;

    const form = useForm<z.infer<typeof expenseSchema>>({
        resolver: zodResolver(expenseSchema),
        defaultValues: {
            title: '',
            amount: 0,
            categoryId: '',
            date: new Date().toISOString().slice(0, 10),
            note: '',
        },
    });

    useEffect(() => {
        if (open) {
            api.get('/expenses/categories').then(r => setCategories(r.data || [])).catch(() => { });

            if (expense) {
                form.reset({
                    title: expense.title,
                    amount: Number(expense.amount),
                    categoryId: expense.categoryId ? String(expense.categoryId) : '',
                    date: expense.date ? new Date(expense.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
                    note: expense.note || '',
                });
            } else {
                form.reset({
                    title: '',
                    amount: 0,
                    categoryId: '',
                    date: new Date().toISOString().slice(0, 10),
                    note: '',
                });
            }
        }
    }, [open, expense]);

    const onSubmit = async (values: z.infer<typeof expenseSchema>) => {
        try {
            const payload = {
                title: values.title,
                amount: values.amount,
                categoryId: values.categoryId ? parseInt(values.categoryId) : undefined,
                date: values.date,
                note: values.note || '',
            };

            if (isEdit) {
                await api.put(`/expenses/${expense.id}`, payload);
                toast.success('Expense updated');
            } else {
                await api.post('/expenses', payload);
                toast.success('Expense added');
            }
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Something went wrong');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-visible border-none shadow-none bg-transparent">
                <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                    <div className="relative mx-4 -mt-6 mb-4 grid h-24 place-items-center overflow-hidden rounded-xl bg-gradient-to-tr from-red-700 to-red-500 bg-clip-border text-white shadow-lg shadow-red-500/20">
                        <DialogTitle className="block font-sans text-2xl font-semibold leading-snug tracking-normal text-white antialiased">
                            {isEdit ? 'Edit Expense' : 'Add Expense'}
                        </DialogTitle>
                    </div>

                    <div className="px-6 pb-6 pt-2">
                        <DialogDescription className="mb-4 block font-sans text-sm font-normal leading-relaxed text-gray-500 antialiased dark:text-gray-400 text-center">
                            {isEdit ? 'Update expense details.' : 'Record a new expense.'}
                        </DialogDescription>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 dark:text-gray-300">Title *</FormLabel>
                                            <FormControl>
                                                <Input className="h-11 border border-gray-300 bg-background text-sm dark:border-white/20" placeholder="e.g. Shop Rent" {...field} />
                                            </FormControl>
                                            <FormMessage className="text-red-600 text-sm" />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="amount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-gray-700 dark:text-gray-300">Amount *</FormLabel>
                                                <FormControl>
                                                    <Input type="number" min={0} className="h-11 border border-gray-300 bg-background text-sm dark:border-white/20" {...field} />
                                                </FormControl>
                                                <FormMessage className="text-red-600 text-sm" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="date"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-gray-700 dark:text-gray-300">Date *</FormLabel>
                                                <FormControl>
                                                    <Input type="date" className="h-11 border border-gray-300 bg-background text-sm dark:border-white/20" {...field} />
                                                </FormControl>
                                                <FormMessage className="text-red-600 text-sm" />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="categoryId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 dark:text-gray-300">Category</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-11 border border-gray-300 bg-background text-sm dark:border-white/20">
                                                        <SelectValue placeholder="Select category (optional)" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {categories.map(c => (
                                                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />

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
                                        className="w-full bg-red-600 hover:bg-red-700 text-white h-11 text-xs font-bold uppercase tracking-wider shadow-md transition-all hover:shadow-lg"
                                    >
                                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {isEdit ? 'Update Expense' : 'Add Expense'}
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
