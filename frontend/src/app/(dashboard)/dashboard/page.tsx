'use client';

import { DollarSign, Users, ShoppingBag, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
    return (
        <div className="space-y-8">
            {/* Top Stats Row */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Today's Money"
                    value="$53,000"
                    trend="+55%"
                    trendLabel="than last week"
                    icon={DollarSign}
                    iconColor="bg-gray-900"
                />
                <StatsCard
                    title="Today's Users"
                    value="2,300"
                    trend="+3%"
                    trendLabel="than last month"
                    icon={Users}
                    iconColor="bg-gray-800"
                />
                <StatsCard
                    title="New Clients"
                    value="3,462"
                    trend="-2%"
                    trendLabel="than yesterday"
                    trendNegative
                    icon={ShoppingBag}
                    iconColor="bg-gray-700"
                />
                <StatsCard
                    title="Sales"
                    value="$103,430"
                    trend="+5%"
                    trendLabel="than yesterday"
                    icon={Activity}
                    iconColor="bg-gray-900"
                />
            </div>

            {/* Charts Row - Placeholders for now */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="col-span-1 rounded-xl bg-white p-4 shadow-sm dark:bg-[#202940]">
                    <div className="relative -mt-8 h-48 rounded-xl bg-gradient-to-tr from-gray-900 to-gray-700 shadow-lg shadow-gray-900/40">
                        {/* Chart would go here */}
                        <div className="flex h-full items-center justify-center text-white font-medium">Website Views Chart</div>
                    </div>
                    <div className="pt-6">
                        <h6 className="text-lg font-bold text-gray-800 dark:text-white">Website Views</h6>
                        <p className="text-sm text-gray-500">Last Campaign Performance</p>
                    </div>
                </div>

                <div className="col-span-1 rounded-xl bg-white p-4 shadow-sm dark:bg-[#202940]">
                    <div className="relative -mt-8 h-48 rounded-xl bg-gradient-to-tr from-gray-800 to-gray-600 shadow-lg shadow-gray-800/40">
                        {/* Chart would go here */}
                        <div className="flex h-full items-center justify-center text-white font-medium">Daily Sales Chart</div>
                    </div>
                    <div className="pt-6">
                        <h6 className="text-lg font-bold text-gray-800 dark:text-white">Daily Sales</h6>
                        <p className="text-sm text-gray-500">(+15%) increase in today sales.</p>
                    </div>
                </div>

                <div className="col-span-1 rounded-xl bg-white p-4 shadow-sm dark:bg-[#202940]">
                    <div className="relative -mt-8 h-48 rounded-xl bg-gradient-to-tr from-black to-gray-800 shadow-lg shadow-black/40">
                        {/* Chart would go here */}
                        <div className="flex h-full items-center justify-center text-white font-medium">Completed Tasks Chart</div>
                    </div>
                    <div className="pt-6">
                        <h6 className="text-lg font-bold text-gray-800 dark:text-white">Completed Tasks</h6>
                        <p className="text-sm text-gray-500">Last Campaign Performance</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 rounded-xl bg-white p-6 shadow-sm dark:bg-[#202940]">
                    <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Projects</h3>
                    <p className="text-sm text-gray-500">30 done this month</p>
                </div>
                <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-[#202940]">
                    <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Orders Overview</h3>
                    <p className="text-sm text-gray-500">24% this month</p>
                </div>
            </div>
        </div>
    );
}

function StatsCard({ title, value, trend, trendLabel, icon: Icon, iconColor, trendNegative = false }: any) {
    return (
        <div className="relative flex min-w-0 flex-col break-words rounded-xl bg-white bg-clip-border shadow-sm dark:bg-[#202940]">
            <div className={cn("absolute -top-6 left-4 grid h-16 w-16 place-items-center rounded-xl text-white shadow-lg", iconColor)}>
                <Icon className="h-6 w-6 text-white" />
            </div>
            <div className="p-4 text-right">
                <p className="text-sm font-normal text-gray-500 dark:text-gray-400">{title}</p>
                <h4 className="text-2xl font-bold text-gray-800 dark:text-white">{value}</h4>
            </div>
            <div className="border-t border-gray-100 p-4 dark:border-white/10">
                <p className="text-sm text-gray-500">
                    <span className={trendNegative ? "font-bold text-red-500" : "font-bold text-green-500"}>{trend} </span>
                    {trendLabel}
                </p>
            </div>
        </div>
    );
}
