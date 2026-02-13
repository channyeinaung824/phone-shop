import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

const repairSchema = z.object({
    customerId: z.number().int().positive(),
    imeiId: z.number().int().positive().optional(),
    deviceInfo: z.string().min(1),
    issue: z.string().min(1),
    diagnosis: z.string().optional(),
    repairCost: z.number().min(0).optional(),
});

const generateTicketNo = async (prisma: any): Promise<string> => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `RPR-${dateStr}-`;
    const last = await prisma.repairOrder.findFirst({
        where: { ticketNo: { startsWith: prefix } },
        orderBy: { ticketNo: 'desc' },
        select: { ticketNo: true },
    });
    let next = 1;
    if (last) next = parseInt(last.ticketNo.split('-').pop() || '0') + 1;
    return `${prefix}${String(next).padStart(4, '0')}`;
};

export const getRepairOrders = async (request: FastifyRequest<{ Querystring: { q?: string; page?: string; limit?: string; status?: string } }>, reply: FastifyReply) => {
    try {
        const { q, status } = request.query;
        const page = Math.max(1, parseInt(request.query.page || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(request.query.limit || '10', 10)));
        const skip = (page - 1) * limit;

        const where: any = {};
        if (q) {
            where.OR = [
                { ticketNo: { contains: q, mode: 'insensitive' } },
                { customer: { name: { contains: q, mode: 'insensitive' } } },
                { deviceInfo: { contains: q, mode: 'insensitive' } },
            ];
        }
        if (status) where.status = status;

        const [orders, total] = await Promise.all([
            request.server.prisma.repairOrder.findMany({
                where,
                include: {
                    customer: { select: { id: true, name: true, phone: true } },
                    imei: { select: { id: true, imei: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            request.server.prisma.repairOrder.count({ where }),
        ]);

        return { data: orders, total, page, limit, totalPages: Math.ceil(total / limit) };
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const createRepairOrder = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const data = repairSchema.parse(request.body);
        const ticketNo = await generateTicketNo(request.server.prisma);

        const order = await request.server.prisma.repairOrder.create({
            data: {
                ticketNo,
                customerId: data.customerId,
                imeiId: data.imeiId || null,
                deviceInfo: data.deviceInfo,
                issue: data.issue,
                diagnosis: data.diagnosis || null,
                repairCost: data.repairCost || 0,
            },
            include: {
                customer: { select: { id: true, name: true } },
            },
        });
        return reply.code(201).send(order);
    } catch (error: any) {
        if (error instanceof z.ZodError) return reply.code(400).send({ message: 'Validation failed', errors: error.issues });
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const updateRepairOrder = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
        const id = parseInt(request.params.id);
        const { status, diagnosis, repairCost } = request.body as any;

        const updateData: any = {};
        if (status) {
            if (!['RECEIVED', 'DIAGNOSING', 'WAITING_PARTS', 'REPAIRING', 'COMPLETED', 'DELIVERED', 'CANCELLED'].includes(status)) {
                return reply.code(400).send({ message: 'Invalid status' });
            }
            updateData.status = status;
            if (status === 'COMPLETED') updateData.completedAt = new Date();
        }
        if (diagnosis !== undefined) updateData.diagnosis = diagnosis;
        if (repairCost !== undefined) updateData.repairCost = repairCost;

        const order = await request.server.prisma.repairOrder.update({
            where: { id },
            data: updateData,
            include: { customer: { select: { id: true, name: true } } },
        });
        return order;
    } catch (error: any) {
        if (error.code === 'P2025') return reply.code(404).send({ message: 'Order not found' });
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};
