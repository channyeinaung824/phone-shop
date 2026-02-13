import { FastifyReply, FastifyRequest } from 'fastify';

export const getDashboardStats = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        const [
            totalProducts,
            totalCustomers,
            totalSuppliers,
            lowStockProducts,
            // Sales stats
            totalSalesCount,
            monthlySales,
            todaySales,
            // Expense stats
            monthlyExpenses,
            // Purchase stats
            pendingPurchases,
            // Recent sales
            recentSales,
            // Recent expenses
            recentExpenses,
        ] = await Promise.all([
            request.server.prisma.product.count(),
            request.server.prisma.customer.count({ where: { isDeleted: false } }),
            request.server.prisma.supplier.count({ where: { isDeleted: false } }),
            request.server.prisma.product.count({ where: { stock: { lte: 5 } } }),

            // Sales
            request.server.prisma.sale.count({ where: { status: 'COMPLETED' } }),
            request.server.prisma.sale.aggregate({
                where: { status: 'COMPLETED', createdAt: { gte: startOfMonth } },
                _sum: { totalAmount: true },
                _count: true,
            }),
            request.server.prisma.sale.aggregate({
                where: { status: 'COMPLETED', createdAt: { gte: startOfDay } },
                _sum: { totalAmount: true },
                _count: true,
            }),

            // Expenses
            request.server.prisma.expense.aggregate({
                where: { date: { gte: startOfMonth } },
                _sum: { amount: true },
                _count: true,
            }),

            // Purchases
            request.server.prisma.purchase.count({ where: { status: 'PENDING' } }),

            // Recent sales
            request.server.prisma.sale.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    customer: { select: { name: true } },
                    user: { select: { name: true } },
                },
            }),

            // Recent expenses
            request.server.prisma.expense.findMany({
                take: 5,
                orderBy: { date: 'desc' },
                include: { category: { select: { name: true } } },
            }),
        ]);

        const monthlySalesAmount = Number(monthlySales._sum.totalAmount) || 0;
        const monthlyExpenseAmount = Number(monthlyExpenses._sum.amount) || 0;

        return {
            overview: {
                totalProducts,
                totalCustomers,
                totalSuppliers,
                lowStockProducts,
                pendingPurchases,
                totalSalesCount,
            },
            monthly: {
                salesAmount: monthlySalesAmount,
                salesCount: monthlySales._count,
                expenseAmount: monthlyExpenseAmount,
                expenseCount: monthlyExpenses._count,
                profit: monthlySalesAmount - monthlyExpenseAmount,
            },
            today: {
                salesAmount: Number(todaySales._sum.totalAmount) || 0,
                salesCount: todaySales._count,
            },
            recentSales,
            recentExpenses,
        };
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};
