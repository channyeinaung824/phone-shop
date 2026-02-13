import { FastifyInstance } from 'fastify';
import { getTradeIns, createTradeIn, updateTradeInStatus } from '../controllers/tradein.controller';

async function tradeInRoutes(fastify: FastifyInstance) {
    fastify.get('/', { preHandler: [(fastify as any).authenticate] }, getTradeIns);
    fastify.post('/', { preHandler: [(fastify as any).authenticate] }, createTradeIn);
    fastify.put('/:id', { preHandler: [(fastify as any).authenticate] }, updateTradeInStatus);
}

export default tradeInRoutes;
