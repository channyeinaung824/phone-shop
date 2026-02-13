'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from "@/components/ui/switch"
import api from '@/lib/axios';
import { useStore } from '@/store/useStore';

const loginSchema = z.object({
    phone: z.string().min(1, 'Phone number is required'),
    password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
    const router = useRouter();
    const { setUser } = useStore();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const form = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            phone: '',
            password: '',
        },
    });

    async function onSubmit(values: z.infer<typeof loginSchema>) {
        setIsLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/login', values);
            setUser(response.data.user);
            router.push('/dashboard');
        } catch (err: any) {
            console.error(err);
            const message = err.response?.data?.message || 'Something went wrong. Please try again.';
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden">
            {/* Background Image - Mountain/Starry Night */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center"
                style={{
                    backgroundImage: 'url("https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2070&auto=format&fit=crop")', // Starry Mountain
                }}
            >
                <div className="absolute inset-0 bg-black/40" /> {/* Overlay */}
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="z-10 w-full max-w-sm px-4"
            >
                <div className="relative flex flex-col rounded-xl bg-white bg-clip-border text-gray-700 shadow-md">
                    {/* Floating Dark Header */}
                    <div className="relative mx-4 -mt-6 mb-4 grid h-28 place-items-center overflow-hidden rounded-xl bg-gradient-to-tr from-gray-900 to-gray-800 bg-clip-border text-white shadow-lg shadow-gray-900/20">
                        <h3 className="block font-sans text-3xl font-semibold leading-snug tracking-normal text-white antialiased">
                            Sign in
                        </h3>
                    </div>

                    <div className="p-6 flex flex-col gap-4">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    placeholder="Phone Number"
                                                    maxLength={20}
                                                    className="h-11 border border-gray-300 bg-background px-3 py-3 text-sm focus:border-gray-900 focus:ring-0"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    placeholder="Password"
                                                    maxLength={20}
                                                    className="h-11 border border-gray-300 bg-background px-3 py-3 text-sm focus:border-gray-900 focus:ring-0"
                                                    {...field}
                                                    onKeyDown={(e) => {
                                                        if (e.key === ' ') {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex items-center space-x-2">
                                    <Switch id="remember-me" />
                                    <label
                                        htmlFor="remember-me"
                                        className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-500"
                                    >
                                        Remember me
                                    </label>
                                </div>

                                {error && (
                                    <div className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-500 border border-red-200">
                                        {error}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full bg-gray-900 hover:bg-gray-800 text-white h-11 text-xs font-bold uppercase tracking-wider shadow-md transition-all hover:shadow-lg"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        'Sign In'
                                    )}
                                </Button>

                                <div className="mt-4 text-center">
                                    <p className="text-sm text-gray-500">
                                        Don't have an account?{' '}
                                        <a href="#" className="font-bold text-pink-500 hover:text-pink-700">
                                            Sign up
                                        </a>
                                    </p>
                                </div>
                            </form>
                        </Form>
                    </div>
                </div>
            </motion.div >
        </div >
    );
}
