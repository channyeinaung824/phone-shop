import { FastifyReply, FastifyRequest } from 'fastify';

// ── Sales Report ─────────────────────────────────────────
export const getSalesReport = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { from, to, groupBy = 'day' } = request.query as any;

        const where: any = { status: 'COMPLETED' };
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) where.createdAt.lte = new Date(to + 'T23:59:59.999Z');
        }

        const sales = await request.server.prisma.sale.findMany({
            where,
            select: {
                id: true,
                invoiceNo: true,
                totalAmount: true,
                discount: true,
                tax: true,
                createdAt: true,
                customer: { select: { name: true } },
                user: { select: { name: true } },
                items: { select: { quantity: true, unitPrice: true, product: { select: { name: true } } } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const totalSales = sales.reduce((sum: number, s: any) => sum + Number(s.totalAmount), 0);
        const totalDiscount = sales.reduce((sum: number, s: any) => sum + Number(s.discount), 0);
        const totalTax = sales.reduce((sum: number, s: any) => sum + Number(s.tax), 0);
        const netRevenue = totalSales - totalDiscount;

        // Group by day/month
        const grouped: Record<string, { count: number; revenue: number }> = {};
        sales.forEach((s: any) => {
            const d = new Date(s.createdAt);
            const key = groupBy === 'month'
                ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                : d.toISOString().slice(0, 10);
            if (!grouped[key]) grouped[key] = { count: 0, revenue: 0 };
            grouped[key].count++;
            grouped[key].revenue += Number(s.totalAmount);
        });

        return reply.send({
            summary: { totalSales, totalDiscount, totalTax, netRevenue, count: sales.length },
            grouped: Object.entries(grouped).map(([date, val]) => ({ date, ...val })).sort((a, b) => a.date.localeCompare(b.date)),
            sales,
        });
    } catch (error) {
        return reply.status(500).send({ message: 'Failed to generate sales report' });
    }
};

// ── Expense Report ───────────────────────────────────────
export const getExpenseReport = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { from, to } = request.query as any;

        const where: any = {};
        if (from || to) {
            where.date = {};
            if (from) where.date.gte = new Date(from);
            if (to) where.date.lte = new Date(to + 'T23:59:59.999Z');
        }

        const expenses = await request.server.prisma.expense.findMany({
            where,
            include: { category: { select: { name: true } } },
            orderBy: { date: 'desc' },
        });

        const totalExpense = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);

        // Group by category
        const byCategory: Record<string, number> = {};
        expenses.forEach((e: any) => {
            const cat = e.category?.name || 'Uncategorized';
            byCategory[cat] = (byCategory[cat] || 0) + Number(e.amount);
        });

        return reply.send({
            summary: { totalExpense, count: expenses.length },
            byCategory: Object.entries(byCategory).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
            expenses,
        });
    } catch (error) {
        return reply.status(500).send({ message: 'Failed to generate expense report' });
    }
};

// ── Profit & Loss Report ─────────────────────────────────
export const getProfitLossReport = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { from, to } = request.query as any;

        const dateFilter: any = {};
        if (from || to) {
            dateFilter.createdAt = {};
            if (from) dateFilter.createdAt.gte = new Date(from);
            if (to) dateFilter.createdAt.lte = new Date(to + 'T23:59:59.999Z');
        }

        const expDateFilter: any = {};
        if (from || to) {
            expDateFilter.date = {};
            if (from) expDateFilter.date.gte = new Date(from);
            if (to) expDateFilter.date.lte = new Date(to + 'T23:59:59.999Z');
        }

        const [salesAgg, expenseAgg, purchaseAgg] = await Promise.all([
            request.server.prisma.sale.aggregate({
                where: { status: 'COMPLETED', ...dateFilter },
                _sum: { totalAmount: true, discount: true, tax: true },
                _count: true,
            }),
            request.server.prisma.expense.aggregate({
                where: expDateFilter,
                _sum: { amount: true },
                _count: true,
            }),
            request.server.prisma.purchase.aggregate({
                where: { status: 'RECEIVED', ...dateFilter },
                _sum: { totalAmount: true },
                _count: true,
            }),
        ]);

        const totalRevenue = Number(salesAgg._sum?.totalAmount || 0);
        const totalDiscount = Number(salesAgg._sum?.discount || 0);
        const totalTax = Number(salesAgg._sum?.tax || 0);
        const netRevenue = totalRevenue - totalDiscount;
        const totalCOGS = Number(purchaseAgg._sum?.totalAmount || 0);
        const totalExpense = Number(expenseAgg._sum?.amount || 0);
        const grossProfit = netRevenue - totalCOGS;
        const netProfit = grossProfit - totalExpense;

        return reply.send({
            revenue: { total: totalRevenue, discount: totalDiscount, tax: totalTax, net: netRevenue, salesCount: salesAgg._count },
            costs: { cogs: totalCOGS, purchaseCount: purchaseAgg._count },
            expenses: { total: totalExpense, expenseCount: expenseAgg._count },
            profit: { gross: grossProfit, net: netProfit },
        });
    } catch (error) {
        return reply.status(500).send({ message: 'Failed to generate P&L report' });
    }
};

// ── Inventory Report ─────────────────────────────────────
export const getInventoryReport = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const products = await request.server.prisma.product.findMany({
            where: { isDeleted: false },
            include: {
                category: { select: { name: true } },
                _count: { select: { imeis: true } },
            },
            orderBy: { name: 'asc' },
        });

        const imeiCounts = await request.server.prisma.iMEI.groupBy({
            by: ['status'],
            _count: true,
        });

        const totalStock = products.reduce((sum: number, p: any) => sum + p.stock, 0);
        const totalValue = products.reduce((sum: number, p: any) => sum + (p.stock * Number(p.costPrice)), 0);
        const lowStock = products.filter((p: any) => p.stock <= 5 && p.stock > 0);

        return reply.send({
            summary: { totalProducts: products.length, totalStock, totalValue, lowStockCount: lowStock.length },
            imeiStatusBreakdown: imeiCounts.map((i: any) => ({ status: i.status, count: i._count })),
            lowStock: lowStock.map((p: any) => ({ id: p.id, name: p.name, stock: p.stock, category: p.category?.name })),
            products: products.map((p: any) => ({
                id: p.id, name: p.name, stock: p.stock,
                costPrice: Number(p.costPrice), salePrice: Number(p.price),
                value: p.stock * Number(p.costPrice),
                category: p.category?.name, imeiCount: p._count.imeis,
            })),
        });
    } catch (error) {
        return reply.status(500).send({ message: 'Failed to generate inventory report' });
    }
};
