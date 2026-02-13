import { FastifyInstance } from 'fastify';
import { getSalesReport, getExpenseReport, getProfitLossReport, getInventoryReport } from '../controllers/report.controller';
import { Role } from '@prisma/client';

async function reportRoutes(fastify: FastifyInstance) {
    fastify.get('/sales', { preHandler: [(fastify as any).authenticate] }, getSalesReport);
    fastify.get('/expenses', { preHandler: [(fastify as any).authenticate] }, getExpenseReport);
    fastify.get('/profit-loss', { preHandler: [(fastify as any).authenticate, (fastify as any).authorize([Role.ADMIN])] }, getProfitLossReport);
    fastify.get('/inventory', { preHandler: [(fastify as any).authenticate] }, getInventoryReport);
}

export default reportRoutes;
