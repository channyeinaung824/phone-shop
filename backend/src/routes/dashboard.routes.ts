import { FastifyInstance } from 'fastify';
import { getDashboardStats } from '../controllers/dashboard.controller';

async function dashboardRoutes(fastify: FastifyInstance) {
    fastify.get('/stats', {
        preHandler: [(fastify as any).authenticate],
    }, getDashboardStats);
}

export default dashboardRoutes;
