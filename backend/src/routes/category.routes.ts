import { FastifyInstance } from 'fastify';
import { createCategory, deleteCategory, getCategories, updateCategory } from '../controllers/category.controller';
import { Role } from '@prisma/client';

async function categoryRoutes(fastify: FastifyInstance) {
    fastify.get('/', {
        preHandler: [fastify.authenticate], // All authenticated users can list
    }, getCategories);

    fastify.post('/', {
        preHandler: [fastify.authenticate, fastify.authorize([Role.ADMIN])], // Only admin can create
    }, createCategory);

    fastify.put<{ Params: { id: string } }>('/:id', {
        preHandler: [fastify.authenticate, fastify.authorize([Role.ADMIN])], // Only admin can update
    }, updateCategory);

    fastify.delete<{ Params: { id: string } }>('/:id', {
        preHandler: [fastify.authenticate, fastify.authorize([Role.ADMIN])], // Only admin can delete
    }, deleteCategory);
}

export default categoryRoutes;
