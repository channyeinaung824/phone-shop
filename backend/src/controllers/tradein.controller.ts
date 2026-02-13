import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

const tradeInSchema = z.object({
    customerId: z.number().int().positive().optional(),
    imeiId: z.number().int().positive().optional(),
    productId: z.number().int().positive().optional(),
    deviceName: z.string().min(1),
    condition: z.string().min(1),
    offeredPrice: z.number().positive(),
    note: z.string().optional(),
});

export const getTradeIns = async (request: FastifyRequest<{ Querystring: { q?: string; page?: string; limit?: string; status?: string } }>, reply: FastifyReply) => {
    try {
        const { q, status } = request.query;
        const page = Math.max(1, parseInt(request.query.page || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(request.query.limit || '10', 10)));
        const skip = (page - 1) * limit;

        const where: any = {};
        if (q) {
            where.OR = [
                { deviceName: { contains: q, mode: 'insensitive' } },
                { customer: { name: { contains: q, mode: 'insensitive' } } },
            ];
        }
        if (status) where.status = status;

        const [tradeIns, total] = await Promise.all([
            request.server.prisma.tradeIn.findMany({
                where,
                include: {
                    customer: { select: { id: true, name: true, phone: true } },
                    imei: { select: { id: true, imei: true } },
                    product: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            request.server.prisma.tradeIn.count({ where }),
        ]);

        return { data: tradeIns, total, page, limit, totalPages: Math.ceil(total / limit) };
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const createTradeIn = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const data = tradeInSchema.parse(request.body);

        const tradeIn = await request.server.prisma.tradeIn.create({
            data: {
                customerId: data.customerId || null,
                imeiId: data.imeiId || null,
                productId: data.productId || null,
                deviceName: data.deviceName,
                condition: data.condition,
                offeredPrice: data.offeredPrice,
                note: data.note || null,
            },
            include: {
                customer: { select: { id: true, name: true } },
            },
        });
        return reply.code(201).send(tradeIn);
    } catch (error: any) {
        if (error instanceof z.ZodError) return reply.code(400).send({ message: 'Validation failed', errors: error.issues });
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const updateTradeInStatus = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
        const id = parseInt(request.params.id);
        const { status } = request.body as any;

        if (!['PENDING', 'ACCEPTED', 'REJECTED', 'RESOLD'].includes(status)) {
            return reply.code(400).send({ message: 'Invalid status' });
        }

        const tradeIn = await request.server.prisma.$transaction(async (tx: any) => {
            const existing = await tx.tradeIn.findUnique({ where: { id } });
            if (!existing) throw { code: 'P2025' };

            // If accepted and has IMEI, mark IMEI as TRADED_IN
            if (status === 'ACCEPTED' && existing.imeiId) {
                await tx.iMEI.update({
                    where: { id: existing.imeiId },
                    data: { status: 'TRADED_IN' },
                });
            }

            return tx.tradeIn.update({ where: { id }, data: { status } });
        });

        return tradeIn;
    } catch (error: any) {
        if (error.code === 'P2025') return reply.code(404).send({ message: 'Trade-in not found' });
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};
