import { FastifyInstance } from 'fastify';
import { getInstallments, getInstallmentById, createInstallment, addPayment } from '../controllers/installment.controller';

async function installmentRoutes(fastify: FastifyInstance) {
    fastify.get('/', { preHandler: [(fastify as any).authenticate] }, getInstallments);
    fastify.get('/:id', { preHandler: [(fastify as any).authenticate] }, getInstallmentById);
    fastify.post('/', { preHandler: [(fastify as any).authenticate] }, createInstallment);
    fastify.post('/:id/payments', { preHandler: [(fastify as any).authenticate] }, addPayment);
}

export default installmentRoutes;
