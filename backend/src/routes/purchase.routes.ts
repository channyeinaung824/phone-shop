import { FastifyInstance } from 'fastify';
import { createPurchase, deletePurchase, getPurchaseById, getPurchases, updatePurchase } from '../controllers/purchase.controller';
import { Role } from '@prisma/client';

async function purchaseRoutes(fastify: FastifyInstance) {
    fastify.get('/', {
        preHandler: [(fastify as any).authenticate],
    }, getPurchases);

    fastify.get('/:id', {
        preHandler: [(fastify as any).authenticate],
    }, getPurchaseById);

    fastify.post('/', {
        preHandler: [(fastify as any).authenticate, (fastify as any).authorize([Role.ADMIN])],
    }, createPurchase);

    fastify.put('/:id', {
        preHandler: [(fastify as any).authenticate, (fastify as any).authorize([Role.ADMIN])],
    }, updatePurchase);

    fastify.delete('/:id', {
        preHandler: [(fastify as any).authenticate, (fastify as any).authorize([Role.ADMIN])],
    }, deletePurchase);
}

export default purchaseRoutes;
