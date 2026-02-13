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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import api from '@/lib/axios';

// Schema factory – create/edit အလိုက် သီးသန့် validation သတ်မှတ်ရန်
const getUserSchema = (isEdit: boolean) => {
    return z.object({
        name: z.string().trim().min(1, 'Please enter the name').max(50, 'Name must be at most 50 characters'),
        phone: z.string()
            .transform(val => val.replace(/\s/g, '')) // Remove spaces first
            .pipe(
                z.string().min(6, 'Please enter valid phone number')
                    .max(20, 'Phone must be at most 20 characters')
                    .regex(/^[0-9+]+$/, 'Phone number must contain only numbers and +')
                    .refine((val) => !/[\u1000-\u109F]/.test(val), 'Phone number cannot contain Myanmar characters')
            ),
        password: isEdit
            ? z.string().optional()
                .transform(val => {
                    if (!val) return undefined;
                    const cleaned = val.replace(/\s/g, '');
                    return cleaned === '' ? undefined : cleaned;
                })
                .pipe(
                    z.string().max(20, 'Password must be at most 20 characters')
                        .optional()
                        .refine(val => !val || val.length >= 6, 'Password must be at least 6 characters')
                        .refine(val => !val || !/[\u1000-\u109F]/.test(val), 'Password cannot contain Myanmar characters')
                )
            : z.string().min(6, 'Password must be at least 6 characters'),
        role: z.enum(['ADMIN', 'SELLER']),
        status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
    });
};

interface UserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user?: any;
    onSuccess: () => void;
}

export function UserDialog({ open, onOpenChange, user, onSuccess }: UserDialogProps) {
    const isEdit = !!user;

    const form = useForm<z.infer<ReturnType<typeof getUserSchema>>>({
        resolver: zodResolver(getUserSchema(isEdit)),
        defaultValues: {
            name: '',
            phone: '',
            password: '',
            role: 'SELLER',
            status: 'ACTIVE',
        },
    });

    // Dialog ဖွင့်တိုင်း form ကို reset လုပ်ပြီး user data ဖြည့်ပေးခြင်း
    useEffect(() => {
        if (open) {
            if (user) {
                form.reset({
                    name: user.name,
                    phone: user.phone,
                    role: user.role,
                    status: user.status,
                    password: '', // edit လုပ်လျှင် password ကို မဖြည့်ထားချေ
                });
            } else {
                form.reset({
                    name: '',
                    phone: '',
                    password: '',
                    role: 'SELLER',
                    status: 'ACTIVE',
                });
            }
        }
    }, [open, user, form]); // open ကိုလည်း ထည့်စစ်ထားသည် – dialog ဖွင့်မှ reset လုပ်ရန်

    const onSubmit = async (values: z.infer<ReturnType<typeof getUserSchema>>) => {
        try {
            if (user) {
                // Edit mode – password မထည့်ထားပါက payload ထဲမှ ဖယ်ရှားရန်
                const payload = { ...values };
                if (!payload.password) {
                    delete payload.password;
                }
                await api.put(`/users/${user.id}`, payload);
            } else {
                // Create mode – password ကို schema က စစ်ပြီးသား
                await api.post('/users', values);
            }

            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error(error);

            // Backend error handling – field errors နှင့် general errors ခွဲပြီးကိုင်တွယ်ခြင်း
            if (error.response) {
                const { status, data } = error.response;

                // 1. Email duplicate (409)
                if (status === 409) {
                    const description = 'A user with this phone number already exists.';
                    toast.error('User exists', {
                        description: description,
                    });
                    form.setError('phone', { message: description }); // Also set on field
                    return;
                }

                // 2. Validation errors (400) – ပုံမှန် Zod format ဖြင့်လာသော errors
                const validationErrors = data.errors;
                let handled = false;
                if (Array.isArray(validationErrors)) {
                    validationErrors.forEach((err: any) => {
                        const path = err.path?.[0]; // Zod path (e.g., "password")
                        const message = err.message;
                        if (path && ['name', 'phone', 'password', 'role', 'status'].includes(path)) {
                            form.setError(path as any, { message });
                            handled = true;
                        }
                    });

                    if (handled) return; // Field errors များကို form ထဲတွင်ပြပြီးဖြစ်၍ toast မလိုတော့
                }

                // 3. အခြား error (e.g. 500) – backend မှ message ပါလာလျှင် သုံးမည်
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
            <DialogContent className="sm:max-w-[500px] p-0 overflow-visible border-none shadow-none bg-transparent">
                <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                    {/* Floating Dark Header */}
                    <div className="relative mx-4 -mt-6 mb-4 grid h-24 place-items-center overflow-hidden rounded-xl bg-gradient-to-tr from-gray-900 to-gray-800 bg-clip-border text-white shadow-lg shadow-gray-900/20">
                        <DialogTitle className="block font-sans text-2xl font-semibold leading-snug tracking-normal text-white antialiased">
                            {user ? 'Edit User' : 'Add User'}
                        </DialogTitle>
                    </div>

                    <div className="px-6 pb-6 pt-2">
                        <DialogDescription className="mb-6 block font-sans text-sm font-normal leading-relaxed text-gray-500 antialiased dark:text-gray-400 text-center">
                            {user
                                ? 'Update user profile details below.'
                                : 'Enter the details to create a new user.'}
                        </DialogDescription>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                                {/* Name Field */}
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 dark:text-gray-300">Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    maxLength={30}
                                                    className="h-11 border border-gray-300 bg-background px-3 py-3 text-sm focus:border-gray-900 focus:ring-0 dark:border-white/20 dark:focus:border-white"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-600 text-sm" />
                                            {form.formState.errors.name && (
                                                <p className="text-sm font-medium text-red-600" style={{ color: 'red' }}>
                                                    {String(form.formState.errors.name.message)}
                                                </p>
                                            )}
                                        </FormItem>
                                    )}
                                />

                                {/* Phone Field */}
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 dark:text-gray-300">
                                                Phone
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    maxLength={20}
                                                    className="h-11 border border-gray-300 bg-background px-3 py-3 text-sm focus:border-gray-900 focus:ring-0 dark:border-white/20 dark:focus:border-white"
                                                    {...field}
                                                    onKeyDown={(e) => {
                                                        if (e.key === ' ') {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-600 text-sm" />
                                            {form.formState.errors.phone && (
                                                <p className="text-sm font-medium text-red-600" style={{ color: 'red' }}>
                                                    {String(form.formState.errors.phone.message)}
                                                </p>
                                            )}
                                        </FormItem>
                                    )}
                                />

                                {/* Password Field */}
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 dark:text-gray-300">
                                                {user ? 'Password (leave blank to keep)' : 'Password'}
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    maxLength={20}
                                                    className="h-11 border border-gray-300 bg-background px-3 py-3 text-sm focus:border-gray-900 focus:ring-0 dark:border-white/20 dark:focus:border-white"
                                                    {...field}
                                                    onKeyDown={(e) => {
                                                        if (e.key === ' ') {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-600 text-sm" />
                                            {form.formState.errors.password && (
                                                <p className="text-sm font-medium text-red-600" style={{ color: 'red' }}>
                                                    {String(form.formState.errors.password.message)}
                                                </p>
                                            )}
                                        </FormItem>
                                    )}
                                />

                                {/* Role & Status */}
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="role"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-gray-700 dark:text-gray-300">
                                                    Role
                                                </FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="h-11 border border-gray-300 bg-background px-3 py-3 text-sm focus:border-gray-900 focus:ring-0 dark:border-white/20 dark:focus:border-white">
                                                            <SelectValue placeholder="Select a role" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                                        <SelectItem value="SELLER">Seller</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage className="text-red-600 text-sm" />
                                                {form.formState.errors.role && (
                                                    <p className="text-sm font-medium text-red-600" style={{ color: 'red' }}>
                                                        {String(form.formState.errors.role.message)}
                                                    </p>
                                                )}
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-gray-700 dark:text-gray-300">
                                                    Status
                                                </FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="h-11 border border-gray-300 bg-background px-3 py-3 text-sm focus:border-gray-900 focus:ring-0 dark:border-white/20 dark:focus:border-white">
                                                            <SelectValue placeholder="Select status" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="ACTIVE">Active</SelectItem>
                                                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                                                        <SelectItem value="SUSPENDED">Suspended</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage className="text-red-600 text-sm" />
                                                {form.formState.errors.status && (
                                                    <p className="text-sm font-medium text-red-600" style={{ color: 'red' }}>
                                                        {String(form.formState.errors.status.message)}
                                                    </p>
                                                )}
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="pt-4">
                                    <Button
                                        type="submit"
                                        disabled={form.formState.isSubmitting}
                                        className="w-full bg-gray-900 hover:bg-gray-800 text-white h-11 text-xs font-bold uppercase tracking-wider shadow-md transition-all hover:shadow-lg dark:bg-white dark:text-gray-900"
                                    >
                                        {form.formState.isSubmitting && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        {user ? 'Save Changes' : 'Create User'}
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