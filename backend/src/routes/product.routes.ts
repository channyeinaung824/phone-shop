import { FastifyInstance } from 'fastify';
import { createProduct, deleteProduct, getProducts, updateProduct, importProducts } from '../controllers/product.controller';
import { Role } from '@prisma/client';

async function productRoutes(fastify: FastifyInstance) {
    fastify.get('/', {
        preHandler: [(fastify as any).authenticate], // All authenticated users can list
    }, getProducts);

    fastify.post('/', {
        preHandler: [(fastify as any).authenticate, (fastify as any).authorize([Role.ADMIN])], // Only admin can create
    }, createProduct);

    fastify.post('/import', {
        preHandler: [(fastify as any).authenticate, (fastify as any).authorize([Role.ADMIN])], // Only admin can import
    }, importProducts);

    fastify.put('/:id', {
        preHandler: [(fastify as any).authenticate, (fastify as any).authorize([Role.ADMIN])], // Only admin can update
    }, updateProduct);

    fastify.delete('/:id', {
        preHandler: [(fastify as any).authenticate, (fastify as any).authorize([Role.ADMIN])], // Only admin can delete
    }, deleteProduct);
}

export default productRoutes;
