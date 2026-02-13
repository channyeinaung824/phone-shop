import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

const warrantySchema = z.object({
    productId: z.number().int().positive(),
    imeiId: z.number().int().positive().optional(),
    customerId: z.number().int().positive().optional(),
    type: z.enum(['MANUFACTURER', 'SHOP', 'EXTENDED']),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    note: z.string().optional(),
});

export const getWarranties = async (request: FastifyRequest<{ Querystring: { q?: string; page?: string; limit?: string; status?: string; type?: string } }>, reply: FastifyReply) => {
    try {
        const { q, status, type } = request.query;
        const page = Math.max(1, parseInt(request.query.page || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(request.query.limit || '10', 10)));
        const skip = (page - 1) * limit;

        const where: any = {};
        if (q) {
            where.OR = [
                { product: { name: { contains: q, mode: 'insensitive' } } },
                { customer: { name: { contains: q, mode: 'insensitive' } } },
                { imei: { imei: { contains: q, mode: 'insensitive' } } },
            ];
        }
        if (status) where.status = status;
        if (type) where.type = type;

        const [warranties, total] = await Promise.all([
            request.server.prisma.warranty.findMany({
                where,
                include: {
                    product: { select: { id: true, name: true, brand: true } },
                    imei: { select: { id: true, imei: true } },
                    customer: { select: { id: true, name: true, phone: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            request.server.prisma.warranty.count({ where }),
        ]);

        return { data: warranties, total, page, limit, totalPages: Math.ceil(total / limit) };
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const createWarranty = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const data = warrantySchema.parse(request.body);
        const warranty = await request.server.prisma.warranty.create({
            data: {
                productId: data.productId,
                imeiId: data.imeiId || null,
                customerId: data.customerId || null,
                type: data.type,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                note: data.note || null,
            },
            include: {
                product: { select: { id: true, name: true } },
                imei: { select: { id: true, imei: true } },
                customer: { select: { id: true, name: true } },
            },
        });
        return reply.code(201).send(warranty);
    } catch (error: any) {
        if (error instanceof z.ZodError) return reply.code(400).send({ message: 'Validation failed', errors: error.issues });
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const updateWarrantyStatus = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
        const id = parseInt(request.params.id);
        const { status } = request.body as any;
        if (!['ACTIVE', 'EXPIRED', 'CLAIMED', 'VOIDED'].includes(status)) {
            return reply.code(400).send({ message: 'Invalid status' });
        }
        const warranty = await request.server.prisma.warranty.update({
            where: { id },
            data: { status },
        });
        return warranty;
    } catch (error: any) {
        if (error.code === 'P2025') return reply.code(404).send({ message: 'Warranty not found' });
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const deleteWarranty = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
        await request.server.prisma.warranty.delete({ where: { id: parseInt(request.params.id) } });
        return { message: 'Warranty deleted' };
    } catch (error: any) {
        if (error.code === 'P2025') return reply.code(404).send({ message: 'Warranty not found' });
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};
