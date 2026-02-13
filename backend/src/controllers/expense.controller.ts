import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

// ── Expense Category (simple CRUD) ──────────────────────

const categorySchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
});

export const getExpenseCategories = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const categories = await request.server.prisma.expenseCategory.findMany({
            orderBy: { name: 'asc' },
            include: { _count: { select: { expenses: true } } },
        });
        return categories;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const createExpenseCategory = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const data = categorySchema.parse(request.body);

        const existing = await request.server.prisma.expenseCategory.findUnique({
            where: { name: data.name },
        });
        if (existing) {
            return reply.code(409).send({ message: 'Category name already exists' });
        }

        const category = await request.server.prisma.expenseCategory.create({ data });
        return reply.code(201).send(category);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return reply.code(400).send({ message: 'Validation failed', errors: error.issues });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const deleteExpenseCategory = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
        const id = parseInt(request.params.id);

        const count = await request.server.prisma.expense.count({ where: { categoryId: id } });
        if (count > 0) {
            return reply.code(400).send({ message: `Cannot delete: ${count} expense(s) use this category` });
        }

        await request.server.prisma.expenseCategory.delete({ where: { id } });
        return { message: 'Category deleted' };
    } catch (error: any) {
        if (error.code === 'P2025') {
            return reply.code(404).send({ message: 'Category not found' });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

// ── Expenses ─────────────────────────────────────────────

const expenseSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200),
    amount: z.number().positive('Amount must be positive'),
    categoryId: z.number().int().positive().optional(),
    note: z.string().optional(),
    date: z.string().optional(), // ISO date string
});

export const getExpenses = async (request: FastifyRequest<{ Querystring: { q?: string; page?: string; limit?: string; categoryId?: string; from?: string; to?: string } }>, reply: FastifyReply) => {
    try {
        const { q, categoryId, from, to } = request.query;
        const page = Math.max(1, parseInt(request.query.page || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(request.query.limit || '10', 10)));
        const skip = (page - 1) * limit;

        const where: any = {};

        if (q) {
            where.OR = [
                { title: { contains: q, mode: 'insensitive' } },
                { note: { contains: q, mode: 'insensitive' } },
            ];
        }

        if (categoryId) where.categoryId = parseInt(categoryId);

        if (from || to) {
            where.date = {};
            if (from) where.date.gte = new Date(from);
            if (to) where.date.lte = new Date(to + 'T23:59:59.999Z');
        }

        const [expenses, total, totalAmount] = await Promise.all([
            request.server.prisma.expense.findMany({
                where,
                include: {
                    category: { select: { id: true, name: true } },
                },
                orderBy: { date: 'desc' },
                skip,
                take: limit,
            }),
            request.server.prisma.expense.count({ where }),
            request.server.prisma.expense.aggregate({
                where,
                _sum: { amount: true },
            }),
        ]);

        return {
            data: expenses,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            totalAmount: totalAmount._sum.amount || 0,
        };
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const createExpense = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const data = expenseSchema.parse(request.body);

        const expense = await request.server.prisma.expense.create({
            data: {
                title: data.title,
                amount: data.amount,
                categoryId: data.categoryId || null,
                note: data.note || null,
                date: data.date ? new Date(data.date) : new Date(),
            },
            include: { category: { select: { id: true, name: true } } },
        });

        return reply.code(201).send(expense);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return reply.code(400).send({ message: 'Validation failed', errors: error.issues });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const updateExpense = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
        const id = parseInt(request.params.id);
        const data = expenseSchema.partial().parse(request.body);

        const expense = await request.server.prisma.expense.update({
            where: { id },
            data: {
                ...(data.title && { title: data.title }),
                ...(data.amount !== undefined && { amount: data.amount }),
                ...(data.categoryId !== undefined && { categoryId: data.categoryId || null }),
                ...(data.note !== undefined && { note: data.note || null }),
                ...(data.date && { date: new Date(data.date) }),
            },
            include: { category: { select: { id: true, name: true } } },
        });

        return expense;
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return reply.code(400).send({ message: 'Validation failed', errors: error.issues });
        }
        if (error.code === 'P2025') {
            return reply.code(404).send({ message: 'Expense not found' });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const deleteExpense = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
        const id = parseInt(request.params.id);
        await request.server.prisma.expense.delete({ where: { id } });
        return { message: 'Expense deleted' };
    } catch (error: any) {
        if (error.code === 'P2025') {
            return reply.code(404).send({ message: 'Expense not found' });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};
