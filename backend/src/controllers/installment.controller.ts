import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

const installmentSchema = z.object({
    saleId: z.number().int().positive(),
    customerId: z.number().int().positive(),
    totalAmount: z.number().positive(),
    downPayment: z.number().min(0),
    monthlyAmount: z.number().positive(),
    totalMonths: z.number().int().positive(),
    startDate: z.string().optional(),
});

export const getInstallments = async (request: FastifyRequest<{ Querystring: { q?: string; page?: string; limit?: string; status?: string } }>, reply: FastifyReply) => {
    try {
        const { q, status } = request.query;
        const page = Math.max(1, parseInt(request.query.page || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(request.query.limit || '10', 10)));
        const skip = (page - 1) * limit;

        const where: any = {};
        if (q) {
            where.OR = [
                { customer: { name: { contains: q, mode: 'insensitive' } } },
                { customer: { phone: { contains: q, mode: 'insensitive' } } },
            ];
        }
        if (status) where.status = status;

        const [installments, total] = await Promise.all([
            request.server.prisma.installment.findMany({
                where,
                include: {
                    customer: { select: { id: true, name: true, phone: true } },
                    sale: { select: { id: true, invoiceNo: true } },
                    payments: { orderBy: { paidAt: 'desc' } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            request.server.prisma.installment.count({ where }),
        ]);

        return { data: installments, total, page, limit, totalPages: Math.ceil(total / limit) };
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const getInstallmentById = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
        const inst = await request.server.prisma.installment.findUnique({
            where: { id: parseInt(request.params.id) },
            include: {
                customer: true,
                sale: { include: { items: { include: { product: { select: { name: true } } } } } },
                payments: { orderBy: { paidAt: 'desc' } },
            },
        });
        if (!inst) return reply.code(404).send({ message: 'Installment not found' });
        return inst;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const createInstallment = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const data = installmentSchema.parse(request.body);
        const remaining = data.totalAmount - data.downPayment;

        const installment = await request.server.prisma.installment.create({
            data: {
                saleId: data.saleId,
                customerId: data.customerId,
                totalAmount: data.totalAmount,
                downPayment: data.downPayment,
                remaining,
                monthlyAmount: data.monthlyAmount,
                totalMonths: data.totalMonths,
                startDate: data.startDate ? new Date(data.startDate) : new Date(),
            },
            include: {
                customer: { select: { id: true, name: true } },
                sale: { select: { id: true, invoiceNo: true } },
            },
        });
        return reply.code(201).send(installment);
    } catch (error: any) {
        if (error instanceof z.ZodError) return reply.code(400).send({ message: 'Validation failed', errors: error.issues });
        if (error.code === 'P2002') return reply.code(409).send({ message: 'Installment already exists for this sale' });
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const addPayment = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
        const id = parseInt(request.params.id);
        const { amount, note } = z.object({
            amount: z.number().positive(),
            note: z.string().optional(),
        }).parse(request.body);

        const result = await request.server.prisma.$transaction(async (tx: any) => {
            const inst = await tx.installment.findUnique({ where: { id } });
            if (!inst) throw { code: 'P2025' };
            if (inst.status !== 'ACTIVE') throw { custom: 'Installment is not active' };

            const payment = await tx.installmentPayment.create({
                data: { installmentId: id, amount, note: note || null },
            });

            const newRemaining = Number(inst.remaining) - amount;
            const updateData: any = { remaining: Math.max(0, newRemaining) };
            if (newRemaining <= 0) updateData.status = 'COMPLETED';

            await tx.installment.update({ where: { id }, data: updateData });
            return payment;
        });

        return reply.code(201).send(result);
    } catch (error: any) {
        if (error.code === 'P2025') return reply.code(404).send({ message: 'Installment not found' });
        if (error.custom) return reply.code(400).send({ message: error.custom });
        if (error instanceof z.ZodError) return reply.code(400).send({ message: 'Validation failed', errors: error.issues });
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};
