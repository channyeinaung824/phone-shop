import { FastifyInstance } from 'fastify';
import { createSale, getSaleById, getSales, voidSale, refundSale } from '../controllers/sale.controller';
import { Role } from '@prisma/client';

async function saleRoutes(fastify: FastifyInstance) {
    fastify.get('/', {
        preHandler: [(fastify as any).authenticate],
    }, getSales);

    fastify.get('/:id', {
        preHandler: [(fastify as any).authenticate],
    }, getSaleById);

    fastify.post('/', {
        preHandler: [(fastify as any).authenticate],
    }, createSale);

    fastify.put('/:id/void', {
        preHandler: [(fastify as any).authenticate, (fastify as any).authorize([Role.ADMIN])],
    }, voidSale);

    fastify.put('/:id/refund', {
        preHandler: [(fastify as any).authenticate, (fastify as any).authorize([Role.ADMIN])],
    }, refundSale);
}

export default saleRoutes;
