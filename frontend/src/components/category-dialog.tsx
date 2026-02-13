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
import api from '@/lib/axios';

const categorySchema = z.object({
    name: z.string().min(1, 'Category name is required'),
});

interface CategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category?: any;
    onSuccess: () => void;
}

export function CategoryDialog({ open, onOpenChange, category, onSuccess }: CategoryDialogProps) {
    const form = useForm<z.infer<typeof categorySchema>>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            name: '',
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                name: category ? category.name : '',
            });
        }
    }, [open, category, form]);

    const onSubmit = async (values: z.infer<typeof categorySchema>) => {
        try {
            if (category) {
                await api.put(`/categories/${category.id}`, values);
                toast.success('Category updated successfully');
            } else {
                await api.post('/categories', values);
                toast.success('Category created successfully');
            }
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error(error);
            const data = error.response?.data;

            if (data) {
                // 1. Conflict Errors (409)
                if (error.response.status === 409) {
                    const description = data.message || 'Category already exists.';
                    toast.error('Error', { description });
                    if (description.toLowerCase().includes('name')) {
                        form.setError('name', { message: description });
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
                        if (path && ['name'].includes(path)) {
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
            <DialogContent className="sm:max-w-[425px] p-0 overflow-visible border-none shadow-none bg-transparent">
                <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                    {/* Header */}
                    <div className="relative mx-4 -mt-6 mb-4 grid h-24 place-items-center overflow-hidden rounded-xl bg-gradient-to-tr from-gray-900 to-gray-800 bg-clip-border text-white shadow-lg shadow-gray-900/20">
                        <DialogTitle className="block font-sans text-2xl font-semibold leading-snug tracking-normal text-white antialiased">
                            {category ? 'Edit Category' : 'Add Category'}
                        </DialogTitle>
                    </div>

                    <div className="px-6 pb-6 pt-2">
                        <DialogDescription className="mb-6 block font-sans text-sm font-normal leading-relaxed text-gray-500 antialiased dark:text-gray-400 text-center">
                            {category ? 'Update category details.' : 'Create a new product category.'}
                        </DialogDescription>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 dark:text-gray-300">Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g., Smartphones"
                                                    className="h-11 border border-gray-300 bg-background px-3 py-3 text-sm focus:border-gray-900 focus:ring-0 dark:border-white/20 dark:focus:border-white"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-500" />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="submit"
                                    disabled={form.formState.isSubmitting}
                                    className="w-full bg-gray-900 hover:bg-gray-800 text-white h-11 text-xs font-bold uppercase tracking-wider shadow-md transition-all hover:shadow-lg dark:bg-white dark:text-gray-900"
                                >
                                    {form.formState.isSubmitting && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    {category ? 'Save Changes' : 'Create Category'}
                                </Button>
                            </form>
                        </Form>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
