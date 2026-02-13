import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

const createIMEISchema = z.object({
    imei: z.string().min(15, 'IMEI must be at least 15 characters').max(20),
    productId: z.number().int().positive('Product is required'),
    status: z.enum(['IN_STOCK', 'SOLD', 'RESERVED', 'DEFECTIVE', 'TRADED_IN', 'TRANSFERRED']).optional(),
});

const updateIMEISchema = z.object({
    imei: z.string().min(15).max(20).optional(),
    productId: z.number().int().positive().optional(),
    status: z.enum(['IN_STOCK', 'SOLD', 'RESERVED', 'DEFECTIVE', 'TRADED_IN', 'TRANSFERRED']).optional(),
});

const bulkCreateSchema = z.object({
    productId: z.number().int().positive('Product is required'),
    imeis: z.array(z.string().min(15).max(20)).min(1, 'At least one IMEI is required'),
});

export const getIMEIs = async (request: FastifyRequest<{ Querystring: { q?: string; page?: string; limit?: string; productId?: string; status?: string } }>, reply: FastifyReply) => {
    try {
        const { q, productId, status } = request.query;
        const page = Math.max(1, parseInt(request.query.page || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(request.query.limit || '10', 10)));
        const skip = (page - 1) * limit;

        const where: any = {};

        if (q) {
            where.OR = [
                { imei: { contains: q, mode: 'insensitive' } },
                { product: { name: { contains: q, mode: 'insensitive' } } },
                { product: { barcode: { contains: q, mode: 'insensitive' } } },
            ];
        }

        if (productId) where.productId = parseInt(productId);
        if (status) where.status = status;

        const [imeis, total] = await Promise.all([
            request.server.prisma.iMEI.findMany({
                where,
                include: {
                    product: { select: { id: true, name: true, brand: true, barcode: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            request.server.prisma.iMEI.count({ where }),
        ]);

        return {
            data: imeis,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const createIMEI = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const data = createIMEISchema.parse(request.body);

        // Check duplicate
        const existing = await request.server.prisma.iMEI.findUnique({
            where: { imei: data.imei },
        });
        if (existing) {
            return reply.code(409).send({ message: 'IMEI already exists in the system' });
        }

        // Verify product exists
        const product = await request.server.prisma.product.findUnique({
            where: { id: data.productId },
        });
        if (!product) {
            return reply.code(404).send({ message: 'Product not found' });
        }

        const imei = await request.server.prisma.iMEI.create({
            data: {
                imei: data.imei,
                productId: data.productId,
                status: data.status || 'IN_STOCK',
            },
            include: {
                product: { select: { id: true, name: true, brand: true, barcode: true } },
            },
        });

        return reply.code(201).send(imei);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return reply.code(400).send({ message: 'Validation failed', errors: error.issues });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const bulkCreateIMEI = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const data = bulkCreateSchema.parse(request.body);

        // Verify product
        const product = await request.server.prisma.product.findUnique({
            where: { id: data.productId },
        });
        if (!product) {
            return reply.code(404).send({ message: 'Product not found' });
        }

        // Check for duplicates
        const existingIMEIs = await request.server.prisma.iMEI.findMany({
            where: { imei: { in: data.imeis } },
            select: { imei: true },
        });

        if (existingIMEIs.length > 0) {
            const dupes = existingIMEIs.map(e => e.imei);
            return reply.code(409).send({
                message: `Duplicate IMEIs found: ${dupes.join(', ')}`,
                duplicates: dupes,
            });
        }

        const created = await request.server.prisma.iMEI.createMany({
            data: data.imeis.map(imei => ({
                imei,
                productId: data.productId,
                status: 'IN_STOCK' as const,
            })),
        });

        return reply.code(201).send({ count: created.count, message: `${created.count} IMEI(s) added successfully` });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return reply.code(400).send({ message: 'Validation failed', errors: error.issues });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const updateIMEI = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
        const id = parseInt(request.params.id);
        const data = updateIMEISchema.parse(request.body);

        if (data.imei) {
            const existing = await request.server.prisma.iMEI.findFirst({
                where: { imei: data.imei, id: { not: id } },
            });
            if (existing) {
                return reply.code(409).send({ message: 'IMEI already exists' });
            }
        }

        const imei = await request.server.prisma.iMEI.update({
            where: { id },
            data,
            include: {
                product: { select: { id: true, name: true, brand: true, barcode: true } },
            },
        });

        return imei;
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return reply.code(400).send({ message: 'Validation failed', errors: error.issues });
        }
        if (error.code === 'P2025') {
            return reply.code(404).send({ message: 'IMEI not found' });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const deleteIMEI = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
        const id = parseInt(request.params.id);

        const imei = await request.server.prisma.iMEI.findUnique({ where: { id } });
        if (!imei) {
            return reply.code(404).send({ message: 'IMEI not found' });
        }

        if (imei.status === 'SOLD') {
            return reply.code(400).send({ message: 'Cannot delete a sold IMEI' });
        }

        await request.server.prisma.iMEI.delete({ where: { id } });

        return { message: 'IMEI deleted successfully' };
    } catch (error: any) {
        if (error.code === 'P2025') {
            return reply.code(404).send({ message: 'IMEI not found' });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};
