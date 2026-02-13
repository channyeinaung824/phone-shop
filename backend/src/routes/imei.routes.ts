import { FastifyInstance } from 'fastify';
import { createIMEI, bulkCreateIMEI, deleteIMEI, getIMEIs, updateIMEI } from '../controllers/imei.controller';
import { Role } from '@prisma/client';

async function imeiRoutes(fastify: FastifyInstance) {
    fastify.get('/', {
        preHandler: [(fastify as any).authenticate],
    }, getIMEIs);

    fastify.post('/', {
        preHandler: [(fastify as any).authenticate, (fastify as any).authorize([Role.ADMIN])],
    }, createIMEI);

    fastify.post('/bulk', {
        preHandler: [(fastify as any).authenticate, (fastify as any).authorize([Role.ADMIN])],
    }, bulkCreateIMEI);

    fastify.put('/:id', {
        preHandler: [(fastify as any).authenticate, (fastify as any).authorize([Role.ADMIN])],
    }, updateIMEI);

    fastify.delete('/:id', {
        preHandler: [(fastify as any).authenticate, (fastify as any).authorize([Role.ADMIN])],
    }, deleteIMEI);
}

export default imeiRoutes;
