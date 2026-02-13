'use client';

import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Package, DollarSign, FileText, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/axios';

const formatPrice = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });

type ReportType = 'sales' | 'expenses' | 'profit-loss' | 'inventory';

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState<ReportType>('sales');
    const [from, setFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); });
    const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
    const [groupBy, setGroupBy] = useState('day');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const tabs: { key: ReportType; label: string; icon: any; color: string }[] = [
        { key: 'sales', label: 'Sales', icon: DollarSign, color: 'from-green-600 to-green-400' },
        { key: 'expenses', label: 'Expenses', icon: FileText, color: 'from-red-600 to-red-400' },
        { key: 'profit-loss', label: 'Profit & Loss', icon: TrendingUp, color: 'from-blue-600 to-blue-400' },
        { key: 'inventory', label: 'Inventory', icon: Package, color: 'from-amber-600 to-amber-400' },
    ];

    const fetchReport = async () => {
        setLoading(true);
        try {
            let url = `/reports/${activeTab}?from=${from}&to=${to}`;
            if (activeTab === 'sales') url += `&groupBy=${groupBy}`;
            const res = await api.get(url);
            setData(res.data);
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Failed to fetch report');
        }
        setLoading(false);
    };

    useEffect(() => { fetchReport(); }, [activeTab, from, to, groupBy]);

    const StatCard = ({ label, value, color = 'text-gray-900 dark:text-white', sub }: any) => (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-[#202940]">
            <p className="text-xs text-gray-500 uppercase font-bold">{label}</p>
            <p className={`text-xl font-bold mt-1 ${color}`}>{typeof value === 'number' ? formatPrice(value) : value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
    );

    return (
        <div className="mt-6 mb-4 flex flex-col gap-6">
            {/* Tab Selector */}
            <div className="flex flex-wrap gap-2">
                {tabs.map(t => (
                    <Button key={t.key} variant={activeTab === t.key ? 'default' : 'outline'} size="sm"
                        className={`text-sm ${activeTab === t.key ? `bg-gradient-to-r ${t.color} text-white border-0 shadow-lg` : ''}`}
                        onClick={() => { setData(null); setActiveTab(t.key); }}>
                        <t.icon className="mr-1.5 h-4 w-4" /> {t.label}
                    </Button>
                ))}
            </div>

            {/* Filters */}
            {activeTab !== 'inventory' && (
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">From</span>
                        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[150px] text-sm" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">To</span>
                        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[150px] text-sm" />
                    </div>
                    {activeTab === 'sales' && (
                        <Select value={groupBy} onValueChange={setGroupBy}>
                            <SelectTrigger className="h-9 w-[120px] text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="day">By Day</SelectItem>
                                <SelectItem value="month">By Month</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                </div>
            )}

            {loading && <div className="py-12 text-center text-gray-400">Loading report...</div>}

            {/* Sales Report */}
            {!loading && activeTab === 'sales' && data && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <StatCard label="Total Sales" value={data.summary.totalSales} color="text-green-600" sub={`${data.summary.count} transactions`} />
                        <StatCard label="Discount" value={data.summary.totalDiscount} color="text-orange-600" />
                        <StatCard label="Tax" value={data.summary.totalTax} />
                        <StatCard label="Net Revenue" value={data.summary.netRevenue} color="text-blue-600" />
                        <StatCard label="Avg / Sale" value={data.summary.count > 0 ? Math.round(data.summary.totalSales / data.summary.count) : 0} />
                    </div>

                    {data.grouped?.length > 0 && (
                        <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940] p-4">
                            <h4 className="text-sm font-bold mb-3">Revenue by {groupBy === 'month' ? 'Month' : 'Day'}</h4>
                            <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                {data.grouped.map((g: any) => (
                                    <div key={g.date} className="flex items-center gap-3">
                                        <span className="text-xs text-gray-500 w-24 shrink-0 font-mono">{g.date}</span>
                                        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-5 overflow-hidden">
                                            <div className="bg-gradient-to-r from-green-500 to-green-400 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (g.revenue / Math.max(...data.grouped.map((x: any) => x.revenue))) * 100)}%` }} />
                                        </div>
                                        <span className="text-xs font-bold text-green-600 w-24 text-right">{formatPrice(g.revenue)}</span>
                                        <span className="text-xs text-gray-400 w-12 text-right">{g.count}x</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Expense Report */}
            {!loading && activeTab === 'expenses' && data && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard label="Total Expenses" value={data.summary.totalExpense} color="text-red-600" sub={`${data.summary.count} entries`} />
                        <StatCard label="Categories" value={data.byCategory?.length || 0} />
                    </div>

                    {data.byCategory?.length > 0 && (
                        <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940] p-4">
                            <h4 className="text-sm font-bold mb-3">By Category</h4>
                            <div className="space-y-2">
                                {data.byCategory.map((c: any) => (
                                    <div key={c.category} className="flex items-center gap-3">
                                        <span className="text-sm w-32 truncate">{c.category}</span>
                                        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-5 overflow-hidden">
                                            <div className="bg-gradient-to-r from-red-500 to-red-400 h-full rounded-full" style={{ width: `${(c.amount / Math.max(...data.byCategory.map((x: any) => x.amount))) * 100}%` }} />
                                        </div>
                                        <span className="text-sm font-bold text-red-600 w-24 text-right">{formatPrice(c.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* P&L Report */}
            {!loading && activeTab === 'profit-loss' && data && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatCard label="Revenue" value={data.revenue.net} color="text-green-600" sub={`${data.revenue.salesCount} sales`} />
                        <StatCard label="COGS (Purchases)" value={data.costs.cogs} color="text-orange-600" sub={`${data.costs.purchaseCount} purchases`} />
                        <StatCard label="Expenses" value={data.expenses.total} color="text-red-600" sub={`${data.expenses.expenseCount} entries`} />
                        <StatCard label="Net Profit" value={data.profit.net} color={data.profit.net >= 0 ? 'text-green-600' : 'text-red-600'} sub={data.profit.net >= 0 ? '📈 Profitable' : '📉 Loss'} />
                    </div>

                    <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940] p-6">
                        <h4 className="text-sm font-bold mb-4">Profit & Loss Breakdown</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                                <span className="text-sm">Total Revenue</span>
                                <span className="font-bold text-green-600">+ {formatPrice(data.revenue.total)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700 pl-4">
                                <span className="text-sm text-gray-500">Discount</span>
                                <span className="text-sm text-orange-600">- {formatPrice(data.revenue.discount)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                                <span className="text-sm font-semibold">Net Revenue</span>
                                <span className="font-bold">{formatPrice(data.revenue.net)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                                <span className="text-sm">Cost of Goods Sold</span>
                                <span className="font-bold text-orange-600">- {formatPrice(data.costs.cogs)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 px-3 rounded">
                                <span className="text-sm font-semibold">Gross Profit</span>
                                <span className="font-bold">{formatPrice(data.profit.gross)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                                <span className="text-sm">Operating Expenses</span>
                                <span className="font-bold text-red-600">- {formatPrice(data.expenses.total)}</span>
                            </div>
                            <div className={`flex justify-between items-center py-3 px-3 rounded-lg ${data.profit.net >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                <span className="font-bold">Net Profit</span>
                                <span className={`text-xl font-bold ${data.profit.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPrice(data.profit.net)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Inventory Report */}
            {!loading && activeTab === 'inventory' && data && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatCard label="Products" value={data.summary.totalProducts} />
                        <StatCard label="Total Stock" value={data.summary.totalStock} />
                        <StatCard label="Stock Value" value={data.summary.totalValue} color="text-blue-600" />
                        <StatCard label="Low Stock Items" value={data.summary.lowStockCount} color={data.summary.lowStockCount > 0 ? 'text-red-600' : 'text-green-600'} />
                    </div>

                    {data.imeiStatusBreakdown?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {data.imeiStatusBreakdown.map((s: any) => (
                                <Badge key={s.status} variant="outline" className="text-sm px-3 py-1">
                                    {s.status}: <strong className="ml-1">{s.count}</strong>
                                </Badge>
                            ))}
                        </div>
                    )}

                    {data.lowStock?.length > 0 && (
                        <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940] p-4">
                            <h4 className="text-sm font-bold mb-3 text-red-600">⚠ Low Stock Items ({data.lowStock.length})</h4>
                            <div className="space-y-1">
                                {data.lowStock.map((p: any) => (
                                    <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded bg-red-50/50 dark:bg-red-900/10 text-sm">
                                        <span className="font-semibold">{p.name}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-gray-500">{p.category}</span>
                                            <Badge variant="destructive" className="text-xs">{p.stock} left</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                        <div className="max-h-[400px] overflow-y-auto">
                            <Table className="w-full text-left text-sm">
                                <TableHeader className="sticky top-0 z-10 bg-white dark:bg-[#202940]">
                                    <TableRow className="border-b border-gray-100 dark:border-white/10">
                                        <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Product</TableHead>
                                        <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400">Category</TableHead>
                                        <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 text-right">Stock</TableHead>
                                        <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 text-right">Cost</TableHead>
                                        <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 text-right">Sale</TableHead>
                                        <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 text-right">Value</TableHead>
                                        <TableHead className="px-4 py-2 text-xs font-bold uppercase text-gray-400 text-right">IMEIs</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.products?.map((p: any) => (
                                        <TableRow key={p.id} className="border-b border-gray-100 dark:border-white/10 hover:bg-gray-50/50 dark:hover:bg-white/5">
                                            <TableCell className="px-4 py-2 font-semibold">{p.name}</TableCell>
                                            <TableCell className="px-4 py-2 text-xs text-gray-500">{p.category || '-'}</TableCell>
                                            <TableCell className="px-4 py-2 text-right">
                                                <Badge variant={p.stock <= 5 ? 'destructive' : 'secondary'} className="text-xs">{p.stock}</Badge>
                                            </TableCell>
                                            <TableCell className="px-4 py-2 text-right text-sm">{formatPrice(p.costPrice)}</TableCell>
                                            <TableCell className="px-4 py-2 text-right text-sm font-bold">{formatPrice(p.salePrice)}</TableCell>
                                            <TableCell className="px-4 py-2 text-right text-sm font-bold text-blue-600">{formatPrice(p.value)}</TableCell>
                                            <TableCell className="px-4 py-2 text-right text-xs text-gray-500">{p.imeiCount}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
