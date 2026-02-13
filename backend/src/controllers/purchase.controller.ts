import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

const purchaseItemSchema = z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().positive(),
    unitCost: z.number().positive(),
    imeiId: z.number().int().positive().optional(),
});

const createPurchaseSchema = z.object({
    supplierId: z.number().int().positive('Supplier is required'),
    totalAmount: z.number().positive('Total amount is required'),
    paidAmount: z.number().min(0).optional(),
    note: z.string().optional(),
    items: z.array(purchaseItemSchema).min(1, 'At least one item is required'),
});

const updatePurchaseSchema = z.object({
    status: z.enum(['PENDING', 'RECEIVED', 'CANCELLED']).optional(),
    paidAmount: z.number().min(0).optional(),
    note: z.string().optional(),
});

export const getPurchases = async (request: FastifyRequest<{ Querystring: { q?: string; page?: string; limit?: string; status?: string; supplierId?: string } }>, reply: FastifyReply) => {
    try {
        const { q, status, supplierId } = request.query;
        const page = Math.max(1, parseInt(request.query.page || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(request.query.limit || '10', 10)));
        const skip = (page - 1) * limit;

        const where: any = {};

        if (q) {
            where.OR = [
                { supplier: { name: { contains: q, mode: 'insensitive' } } },
                { note: { contains: q, mode: 'insensitive' } },
            ];
        }

        if (status) where.status = status;
        if (supplierId) where.supplierId = parseInt(supplierId);

        const [purchases, total] = await Promise.all([
            request.server.prisma.purchase.findMany({
                where,
                include: {
                    supplier: { select: { id: true, name: true, phone: true } },
                    items: {
                        include: {
                            product: { select: { id: true, name: true, brand: true, barcode: true } },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            request.server.prisma.purchase.count({ where }),
        ]);

        return {
            data: purchases,
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

export const getPurchaseById = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
        const id = parseInt(request.params.id);

        const purchase = await request.server.prisma.purchase.findUnique({
            where: { id },
            include: {
                supplier: true,
                items: {
                    include: {
                        product: { select: { id: true, name: true, brand: true, barcode: true, price: true } },
                    },
                },
            },
        });

        if (!purchase) {
            return reply.code(404).send({ message: 'Purchase not found' });
        }

        return purchase;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const createPurchase = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const data = createPurchaseSchema.parse(request.body);

        // Verify supplier exists
        const supplier = await request.server.prisma.supplier.findUnique({
            where: { id: data.supplierId },
        });
        if (!supplier || supplier.isDeleted) {
            return reply.code(404).send({ message: 'Supplier not found' });
        }

        // Create purchase with items in a transaction
        const purchase = await request.server.prisma.$transaction(async (tx: any) => {
            const newPurchase = await tx.purchase.create({
                data: {
                    supplierId: data.supplierId,
                    totalAmount: data.totalAmount,
                    paidAmount: data.paidAmount || 0,
                    note: data.note || null,
                    status: 'PENDING',
                    items: {
                        create: data.items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitCost: item.unitCost,
                            imeiId: item.imeiId || null,
                        })),
                    },
                },
                include: {
                    supplier: { select: { id: true, name: true } },
                    items: {
                        include: {
                            product: { select: { id: true, name: true, brand: true } },
                        },
                    },
                },
            });

            return newPurchase;
        });

        return reply.code(201).send(purchase);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return reply.code(400).send({ message: 'Validation failed', errors: error.issues });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const updatePurchase = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
        const id = parseInt(request.params.id);
        const data = updatePurchaseSchema.parse(request.body);

        const existing = await request.server.prisma.purchase.findUnique({
            where: { id },
            include: { items: true },
        });

        if (!existing) {
            return reply.code(404).send({ message: 'Purchase not found' });
        }

        // If marking as RECEIVED, update product stock
        if (data.status === 'RECEIVED' && existing.status !== 'RECEIVED') {
            await request.server.prisma.$transaction(async (tx: any) => {
                // Update stock for each item
                for (const item of existing.items) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { increment: item.quantity } },
                    });
                }

                await tx.purchase.update({
                    where: { id },
                    data,
                });
            });
        } else {
            await request.server.prisma.purchase.update({
                where: { id },
                data,
            });
        }

        const updated = await request.server.prisma.purchase.findUnique({
            where: { id },
            include: {
                supplier: { select: { id: true, name: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true, brand: true } },
                    },
                },
            },
        });

        return updated;
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return reply.code(400).send({ message: 'Validation failed', errors: error.issues });
        }
        if (error.code === 'P2025') {
            return reply.code(404).send({ message: 'Purchase not found' });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const deletePurchase = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
        const id = parseInt(request.params.id);

        const purchase = await request.server.prisma.purchase.findUnique({
            where: { id },
        });

        if (!purchase) {
            return reply.code(404).send({ message: 'Purchase not found' });
        }

        if (purchase.status === 'RECEIVED') {
            return reply.code(400).send({ message: 'Cannot delete a received purchase. Cancel it first.' });
        }

        await request.server.prisma.purchase.delete({ where: { id } });

        return { message: 'Purchase deleted successfully' };
    } catch (error: any) {
        if (error.code === 'P2025') {
            return reply.code(404).send({ message: 'Purchase not found' });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};
