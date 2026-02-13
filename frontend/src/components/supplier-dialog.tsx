'use client';

import { useEffect } from 'react';
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
import api from '@/lib/axios';

const supplierSchema = z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
    phone: z.string().optional().or(z.literal('')),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
});

interface SupplierDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    supplier?: any;
    onSuccess: () => void;
}

export function SupplierDialog({ open, onOpenChange, supplier, onSuccess }: SupplierDialogProps) {
    const isEdit = !!supplier;

    const form = useForm<z.infer<typeof supplierSchema>>({
        resolver: zodResolver(supplierSchema),
        defaultValues: {
            name: '',
            phone: '',
            email: '',
            address: '',
        },
    });

    useEffect(() => {
        if (open) {
            if (supplier) {
                form.reset({
                    name: supplier.name,
                    phone: supplier.phone || '',
                    email: supplier.email || '',
                    address: supplier.address || '',
                });
            } else {
                form.reset({ name: '', phone: '', email: '', address: '' });
            }
        }
    }, [open, supplier, form]);

    const onSubmit = async (values: z.infer<typeof supplierSchema>) => {
        try {
            if (supplier) {
                await api.put(`/suppliers/${supplier.id}`, values);
                toast.success('Supplier updated successfully');
            } else {
                await api.post('/suppliers', values);
                toast.success('Supplier created successfully');
            }
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error(error);
            if (error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('Something went wrong');
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-visible border-none shadow-none bg-transparent">
                <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                    <div className="relative mx-4 -mt-6 mb-4 grid h-24 place-items-center overflow-hidden rounded-xl bg-gradient-to-tr from-gray-900 to-gray-800 bg-clip-border text-white shadow-lg shadow-gray-900/20">
                        <DialogTitle className="block font-sans text-2xl font-semibold leading-snug tracking-normal text-white antialiased">
                            {isEdit ? 'Edit Supplier' : 'Add Supplier'}
                        </DialogTitle>
                    </div>

                    <div className="px-6 pb-6 pt-2">
                        <DialogDescription className="mb-6 block font-sans text-sm font-normal leading-relaxed text-gray-500 antialiased dark:text-gray-400 text-center">
                            {isEdit ? 'Update supplier details below.' : 'Enter the details to add a new supplier.'}
                        </DialogDescription>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 dark:text-gray-300">Name *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    maxLength={100}
                                                    className="h-11 border border-gray-300 bg-background px-3 py-3 text-sm focus:border-gray-900 focus:ring-0 dark:border-white/20 dark:focus:border-white"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-600 text-sm" />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="phone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-gray-700 dark:text-gray-300">Phone</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        maxLength={20}
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
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-gray-700 dark:text-gray-300">Email</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="email"
                                                        maxLength={100}
                                                        className="h-11 border border-gray-300 bg-background px-3 py-3 text-sm focus:border-gray-900 focus:ring-0 dark:border-white/20 dark:focus:border-white"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-red-600 text-sm" />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 dark:text-gray-300">Address</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    maxLength={200}
                                                    rows={2}
                                                    className="border border-gray-300 bg-background px-3 py-3 text-sm focus:border-gray-900 focus:ring-0 dark:border-white/20 dark:focus:border-white resize-none"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-600 text-sm" />
                                        </FormItem>
                                    )}
                                />

                                <div className="pt-4">
                                    <Button
                                        type="submit"
                                        disabled={form.formState.isSubmitting}
                                        className="w-full bg-gray-900 hover:bg-gray-800 text-white h-11 text-xs font-bold uppercase tracking-wider shadow-md transition-all hover:shadow-lg dark:bg-white dark:text-gray-900"
                                    >
                                        {form.formState.isSubmitting && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        {isEdit ? 'Save Changes' : 'Add Supplier'}
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
