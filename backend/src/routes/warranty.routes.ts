import { FastifyInstance } from 'fastify';
import { getWarranties, createWarranty, updateWarrantyStatus, deleteWarranty } from '../controllers/warranty.controller';
import { Role } from '@prisma/client';

async function warrantyRoutes(fastify: FastifyInstance) {
    fastify.get('/', { preHandler: [(fastify as any).authenticate] }, getWarranties);
    fastify.post('/', { preHandler: [(fastify as any).authenticate] }, createWarranty);
    fastify.put('/:id', { preHandler: [(fastify as any).authenticate] }, updateWarrantyStatus);
    fastify.delete('/:id', { preHandler: [(fastify as any).authenticate, (fastify as any).authorize([Role.ADMIN])] }, deleteWarranty);
}

export default warrantyRoutes;
