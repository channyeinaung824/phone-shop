import { FastifyInstance } from 'fastify';
import { createSupplier, deleteSupplier, getSuppliers, updateSupplier } from '../controllers/supplier.controller';
import { Role } from '@prisma/client';

async function supplierRoutes(fastify: FastifyInstance) {
    fastify.get('/', {
        preHandler: [(fastify as any).authenticate],
    }, getSuppliers);

    fastify.post('/', {
        preHandler: [(fastify as any).authenticate, (fastify as any).authorize([Role.ADMIN])],
    }, createSupplier);

    fastify.put('/:id', {
        preHandler: [(fastify as any).authenticate, (fastify as any).authorize([Role.ADMIN])],
    }, updateSupplier);

    fastify.delete('/:id', {
        preHandler: [(fastify as any).authenticate, (fastify as any).authorize([Role.ADMIN])],
    }, deleteSupplier);
}

export default supplierRoutes;
