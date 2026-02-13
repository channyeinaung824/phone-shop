import { FastifyInstance } from 'fastify';
import { getRepairOrders, createRepairOrder, updateRepairOrder } from '../controllers/repair.controller';

async function repairRoutes(fastify: FastifyInstance) {
    fastify.get('/', { preHandler: [(fastify as any).authenticate] }, getRepairOrders);
    fastify.post('/', { preHandler: [(fastify as any).authenticate] }, createRepairOrder);
    fastify.put('/:id', { preHandler: [(fastify as any).authenticate] }, updateRepairOrder);
}

export default repairRoutes;
