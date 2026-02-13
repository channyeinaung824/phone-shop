import { FastifyInstance } from 'fastify';
import { createCustomer, deleteCustomer, getCustomers, updateCustomer } from '../controllers/customer.controller';
import { Role } from '@prisma/client';

async function customerRoutes(fastify: FastifyInstance) {
    fastify.get('/', {
        preHandler: [(fastify as any).authenticate],
    }, getCustomers);

    fastify.post('/', {
        preHandler: [(fastify as any).authenticate],
    }, createCustomer);

    fastify.put('/:id', {
        preHandler: [(fastify as any).authenticate],
    }, updateCustomer);

    fastify.delete('/:id', {
        preHandler: [(fastify as any).authenticate, (fastify as any).authorize([Role.ADMIN])],
    }, deleteCustomer);
}

export default customerRoutes;
