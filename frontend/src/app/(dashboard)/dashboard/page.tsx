'use client';

import { useEffect, useState } from 'react';
import { DollarSign, Package, Users, Truck, TrendingUp, TrendingDown, ShoppingCart, AlertTriangle, Clock, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/axios';
import { Badge } from '@/components/ui/badge';

const formatPrice = (n: number | string) => {
    const num = Number(n);
    if (isNaN(num)) return '0';
    return num % 1 === 0
        ? num.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const STATUS_COLORS: Record<string, string> = {
    COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    REFUNDED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    VOIDED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function DashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/dashboard/stats')
            .then(r => setStats(r.data))
            .catch(err => console.error('Failed to load dashboard', err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="mt-6 flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="mt-6 text-center text-gray-500">
                <p>Failed to load dashboard data.</p>
            </div>
        );
    }

    const statCards = [
        {
            title: "Today's Sales",
            value: formatPrice(stats.today.salesAmount),
            subtitle: `${stats.today.salesCount} transactions`,
            icon: DollarSign,
            gradient: 'from-green-600 to-green-400',
            shadow: 'shadow-green-500/20',
        },
        {
            title: 'Monthly Sales',
            value: formatPrice(stats.monthly.salesAmount),
            subtitle: `${stats.monthly.salesCount} sales this month`,
            icon: TrendingUp,
            gradient: 'from-blue-600 to-blue-400',
            shadow: 'shadow-blue-500/20',
        },
        {
            title: 'Monthly Expenses',
            value: formatPrice(stats.monthly.expenseAmount),
            subtitle: `${stats.monthly.expenseCount} expenses`,
            icon: TrendingDown,
            gradient: 'from-red-600 to-red-400',
            shadow: 'shadow-red-500/20',
        },
        {
            title: 'Monthly Profit',
            value: formatPrice(stats.monthly.profit),
            subtitle: stats.monthly.profit >= 0 ? 'Net gain' : 'Net loss',
            icon: DollarSign,
            gradient: stats.monthly.profit >= 0 ? 'from-emerald-600 to-emerald-400' : 'from-orange-600 to-orange-400',
            shadow: stats.monthly.profit >= 0 ? 'shadow-emerald-500/20' : 'shadow-orange-500/20',
        },
    ];

    const overviewCards = [
        { title: 'Products', value: stats.overview.totalProducts, icon: Package, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        { title: 'Customers', value: stats.overview.totalCustomers, icon: Users, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        { title: 'Suppliers', value: stats.overview.totalSuppliers, icon: Truck, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
        { title: 'Low Stock', value: stats.overview.lowStockProducts, icon: AlertTriangle, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
        { title: 'Pending Purchases', value: stats.overview.pendingPurchases, icon: Clock, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
        { title: 'Total Sales', value: stats.overview.totalSalesCount, icon: ShoppingCart, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
    ];

    return (
        <div className="mt-6 mb-4 flex flex-col gap-6">
            {/* Top stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((card, i) => (
                    <div key={i} className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                        <div className={`mx-4 -mt-4 rounded-xl bg-gradient-to-tr ${card.gradient} p-4 shadow-lg ${card.shadow}`}>
                            <card.icon className="h-8 w-8 text-white" />
                        </div>
                        <div className="p-4 text-right">
                            <p className="text-xs font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wider">{card.title}</p>
                            <h4 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{card.value}</h4>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{card.subtitle}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Overview counts */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {overviewCards.map((card, i) => (
                    <div key={i} className="flex flex-col items-center bg-white bg-clip-border rounded-xl shadow-sm dark:bg-[#202940] p-4">
                        <div className={`${card.bg} rounded-full p-3 mb-2`}>
                            <card.icon className={`h-5 w-5 ${card.color}`} />
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{card.title}</p>
                    </div>
                ))}
            </div>

            {/* Recent transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Sales */}
                <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                    <div className="relative mx-4 -mt-4 rounded-xl bg-gradient-to-tr from-gray-900 to-gray-700 p-4 shadow-lg shadow-gray-900/20">
                        <div className="flex items-center gap-2 text-white">
                            <ShoppingCart className="h-5 w-5" />
                            <h6 className="font-semibold">Recent Sales</h6>
                        </div>
                    </div>
                    <div className="p-4">
                        {stats.recentSales.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">No sales yet</p>
                        ) : (
                            <div className="space-y-3">
                                {stats.recentSales.map((sale: any) => (
                                    <div key={sale.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-white/10 last:border-0">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white font-mono">{sale.invoiceNo}</p>
                                            <p className="text-xs text-gray-500">
                                                {sale.customer?.name || 'Walk-in'} · {sale.user?.name}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{formatPrice(sale.totalAmount)}</p>
                                            <div className="flex items-center gap-1 justify-end">
                                                <Badge variant="secondary" className={`text-[10px] border-0 ${STATUS_COLORS[sale.status]}`}>{sale.status}</Badge>
                                                <span className="text-[10px] text-gray-400">{format(new Date(sale.createdAt), 'dd MMM')}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Expenses */}
                <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                    <div className="relative mx-4 -mt-4 rounded-xl bg-gradient-to-tr from-red-700 to-red-500 p-4 shadow-lg shadow-red-500/20">
                        <div className="flex items-center gap-2 text-white">
                            <Receipt className="h-5 w-5" />
                            <h6 className="font-semibold">Recent Expenses</h6>
                        </div>
                    </div>
                    <div className="p-4">
                        {stats.recentExpenses.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">No expenses yet</p>
                        ) : (
                            <div className="space-y-3">
                                {stats.recentExpenses.map((expense: any) => (
                                    <div key={expense.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-white/10 last:border-0">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{expense.title}</p>
                                            <p className="text-xs text-gray-500">
                                                {expense.category?.name || 'Uncategorized'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-red-600 dark:text-red-400">{formatPrice(expense.amount)}</p>
                                            <span className="text-[10px] text-gray-400">{format(new Date(expense.date), 'dd MMM')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
