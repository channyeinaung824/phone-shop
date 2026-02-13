import { FastifyReply, FastifyRequest } from 'fastify';

// ── Get Audit Logs (with filters) ────────────────────────
export const getAuditLogs = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { q, entity, action, userId, page = '1', limit = '20', from, to } = request.query as any;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where: any = {};
        if (q) {
            where.OR = [
                { entity: { contains: q, mode: 'insensitive' } },
                { action: { contains: q, mode: 'insensitive' } },
                { user: { name: { contains: q, mode: 'insensitive' } } },
            ];
        }
        if (entity) where.entity = entity;
        if (action) where.action = action;
        if (userId) where.userId = parseInt(userId);
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) where.createdAt.lte = new Date(to + 'T23:59:59.999Z');
        }

        const [data, total] = await Promise.all([
            request.server.prisma.auditLog.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { id: true, name: true, role: true } } },
            }),
            request.server.prisma.auditLog.count({ where }),
        ]);

        return reply.send({ data, total, page: parseInt(page), totalPages: Math.ceil(total / take) });
    } catch (error) {
        return reply.status(500).send({ message: 'Failed to fetch audit logs' });
    }
};

// ── Create Audit Log (helper — called from other controllers) ──
export const createAuditLog = async (
    prisma: any,
    { userId, action, entity, entityId, oldData, newData, ipAddress }: {
        userId?: number; action: string; entity: string; entityId?: number;
        oldData?: any; newData?: any; ipAddress?: string;
    }
) => {
    try {
        await prisma.auditLog.create({
            data: { userId, action, entity, entityId, oldData, newData, ipAddress },
        });
    } catch (e) {
        console.error('Audit log error:', e);
    }
};

// ── Get distinct entities (for filter dropdown) ──────────
export const getAuditEntities = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const entities = await request.server.prisma.auditLog.findMany({
            select: { entity: true },
            distinct: ['entity'],
            orderBy: { entity: 'asc' },
        });
        const actions = await request.server.prisma.auditLog.findMany({
            select: { action: true },
            distinct: ['action'],
            orderBy: { action: 'asc' },
        });
        return reply.send({ entities: entities.map((e: any) => e.entity), actions: actions.map((a: any) => a.action) });
    } catch (error) {
        return reply.status(500).send({ message: 'Failed to fetch filter options' });
    }
};
