import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

const purchaseItemSchema = z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().positive(),
    unitCost: z.number().positive(),
    imeiId: z.number().int().positive().optional(),
});

const additionalExpenseSchema = z.object({
    label: z.string().min(1),
    amount: z.number().min(0),
});

const createPurchaseSchema = z.object({
    supplierId: z.number().int().positive('Supplier is required'),
    totalAmount: z.number().positive('Total amount is required'),
    reduceAmount: z.number().min(0).optional(),
    paidAmount: z.number().min(0).optional(),
    creditAmount: z.number().min(0).optional(),
    paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'KPAY', 'WAVE_PAY', 'INSTALLMENT', 'OTHER']).optional(),
    additionalExpenses: z.array(additionalExpenseSchema).optional(),
    note: z.string().optional(),
    items: z.array(purchaseItemSchema).min(1, 'At least one item is required'),
});

const updatePurchaseSchema = z.object({
    status: z.enum(['PENDING', 'RECEIVED', 'CANCELLED']).optional(),
    paidAmount: z.number().min(0).optional(),
    creditAmount: z.number().min(0).optional(),
    reduceAmount: z.number().min(0).optional(),
    paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'KPAY', 'WAVE_PAY', 'INSTALLMENT', 'OTHER']).optional(),
    additionalExpenses: z.array(additionalExpenseSchema).optional(),
    note: z.string().optional(),
    items: z.array(purchaseItemSchema).optional(),
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

        // Calculate additional expenses total
        const additionalTotal = (data.additionalExpenses || []).reduce((sum, e) => sum + e.amount, 0);
        const netTotal = data.totalAmount - (data.reduceAmount || 0) + additionalTotal;

        // Create purchase with items in a transaction
        const purchase = await request.server.prisma.$transaction(async (tx: any) => {
            const newPurchase = await tx.purchase.create({
                data: {
                    supplierId: data.supplierId,
                    totalAmount: netTotal,
                    reduceAmount: data.reduceAmount || 0,
                    paidAmount: data.paidAmount || 0,
                    creditAmount: data.creditAmount || 0,
                    paymentMethod: data.paymentMethod || 'CASH',
                    additionalExpenses: data.additionalExpenses || [],
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

        await request.server.prisma.$transaction(async (tx: any) => {
            // If marking as RECEIVED, update product stock
            if (data.status === 'RECEIVED' && existing.status !== 'RECEIVED') {
                const itemsToUse = data.items || existing.items;
                for (const item of itemsToUse) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { increment: item.quantity } },
                    });
                }
            }

            // If items are being updated, delete old and create new
            if (data.items && data.items.length > 0) {
                await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
                await tx.purchaseItem.createMany({
                    data: data.items.map(item => ({
                        purchaseId: id,
                        productId: item.productId,
                        quantity: item.quantity,
                        unitCost: item.unitCost,
                        imeiId: item.imeiId || null,
                    })),
                });
                // Recalculate total from new items
                const newItemsTotal = data.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
                const additionalTotal = (data.additionalExpenses || (existing.additionalExpenses as any[] || [])).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
                const reduceAmt = data.reduceAmount ?? (existing.reduceAmount ? Number(existing.reduceAmount) : 0);
                const netTotal = newItemsTotal - reduceAmt + additionalTotal;

                await tx.purchase.update({
                    where: { id },
                    data: {
                        totalAmount: netTotal,
                        ...(data.status && { status: data.status }),
                        ...(data.paidAmount !== undefined && { paidAmount: data.paidAmount }),
                        ...(data.creditAmount !== undefined && { creditAmount: data.creditAmount }),
                        ...(data.reduceAmount !== undefined && { reduceAmount: data.reduceAmount }),
                        ...(data.paymentMethod && { paymentMethod: data.paymentMethod }),
                        ...(data.additionalExpenses && { additionalExpenses: data.additionalExpenses }),
                        ...(data.note !== undefined && { note: data.note }),
                    },
                });
            } else {
                await tx.purchase.update({
                    where: { id },
                    data: {
                        ...(data.status && { status: data.status }),
                        ...(data.paidAmount !== undefined && { paidAmount: data.paidAmount }),
                        ...(data.creditAmount !== undefined && { creditAmount: data.creditAmount }),
                        ...(data.reduceAmount !== undefined && { reduceAmount: data.reduceAmount }),
                        ...(data.paymentMethod && { paymentMethod: data.paymentMethod }),
                        ...(data.additionalExpenses && { additionalExpenses: data.additionalExpenses }),
                        ...(data.note !== undefined && { note: data.note }),
                    },
                });
            }
        });

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
