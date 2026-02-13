import { FastifyInstance } from 'fastify';
import {
    getExpenses, createExpense, updateExpense, deleteExpense,
    getExpenseCategories, createExpenseCategory, deleteExpenseCategory,
} from '../controllers/expense.controller';
import { Role } from '@prisma/client';

async function expenseRoutes(fastify: FastifyInstance) {
    // Expense Categories
    fastify.get('/categories', {
        preHandler: [(fastify as any).authenticate],
    }, getExpenseCategories);

    fastify.post('/categories', {
        preHandler: [(fastify as any).authenticate, (fastify as any).authorize([Role.ADMIN])],
    }, createExpenseCategory);

    fastify.delete('/categories/:id', {
        preHandler: [(fastify as any).authenticate, (fastify as any).authorize([Role.ADMIN])],
    }, deleteExpenseCategory);

    // Expenses
    fastify.get('/', {
        preHandler: [(fastify as any).authenticate],
    }, getExpenses);

    fastify.post('/', {
        preHandler: [(fastify as any).authenticate],
    }, createExpense);

    fastify.put('/:id', {
        preHandler: [(fastify as any).authenticate],
    }, updateExpense);

    fastify.delete('/:id', {
        preHandler: [(fastify as any).authenticate, (fastify as any).authorize([Role.ADMIN])],
    }, deleteExpense);
}

export default expenseRoutes;
