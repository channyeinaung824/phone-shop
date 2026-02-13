import { FastifyInstance } from 'fastify';
import { getAuditLogs, getAuditEntities } from '../controllers/auditlog.controller';
import { Role } from '@prisma/client';

async function auditLogRoutes(fastify: FastifyInstance) {
    fastify.get('/', { preHandler: [(fastify as any).authenticate, (fastify as any).authorize([Role.ADMIN])] }, getAuditLogs);
    fastify.get('/filters', { preHandler: [(fastify as any).authenticate, (fastify as any).authorize([Role.ADMIN])] }, getAuditEntities);
}

export default auditLogRoutes;
