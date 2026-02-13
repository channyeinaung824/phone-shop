import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

const saleItemSchema = z.object({
    productId: z.number().int().positive(),
    imeiId: z.number().int().positive().optional(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
    discount: z.number().min(0).optional(),
});

const createSaleSchema = z.object({
    customerId: z.number().int().positive().optional(),
    subtotal: z.number().positive(),
    discount: z.number().min(0).optional(),
    tax: z.number().min(0).optional(),
    totalAmount: z.number().positive(),
    paidAmount: z.number().min(0),
    changeAmount: z.number().min(0).optional(),
    paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'KPAY', 'WAVE_PAY', 'INSTALLMENT', 'OTHER']),
    note: z.string().optional(),
    items: z.array(saleItemSchema).min(1, 'At least one item is required'),
});

// Generate invoice number: INV-YYYYMMDD-XXXX
const generateInvoiceNo = async (prisma: any): Promise<string> => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `INV-${dateStr}-`;

    const lastSale = await prisma.sale.findFirst({
        where: { invoiceNo: { startsWith: prefix } },
        orderBy: { invoiceNo: 'desc' },
        select: { invoiceNo: true },
    });

    let nextNum = 1;
    if (lastSale) {
        const lastNum = parseInt(lastSale.invoiceNo.split('-').pop() || '0');
        nextNum = lastNum + 1;
    }

    return `${prefix}${String(nextNum).padStart(4, '0')}`;
};

export const getSales = async (request: FastifyRequest<{ Querystring: { q?: string; page?: string; limit?: string; status?: string; paymentMethod?: string } }>, reply: FastifyReply) => {
    try {
        const { q, status, paymentMethod } = request.query;
        const page = Math.max(1, parseInt(request.query.page || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(request.query.limit || '10', 10)));
        const skip = (page - 1) * limit;

        const where: any = {};

        if (q) {
            where.OR = [
                { invoiceNo: { contains: q, mode: 'insensitive' } },
                { customer: { name: { contains: q, mode: 'insensitive' } } },
                { customer: { phone: { contains: q, mode: 'insensitive' } } },
            ];
        }

        if (status) where.status = status;
        if (paymentMethod) where.paymentMethod = paymentMethod;

        const [sales, total] = await Promise.all([
            request.server.prisma.sale.findMany({
                where,
                include: {
                    customer: { select: { id: true, name: true, phone: true } },
                    user: { select: { id: true, name: true } },
                    items: {
                        include: {
                            product: { select: { id: true, name: true, brand: true, barcode: true } },
                            imei: { select: { id: true, imei: true } },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            request.server.prisma.sale.count({ where }),
        ]);

        return {
            data: sales,
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

export const getSaleById = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
        const id = parseInt(request.params.id);

        const sale = await request.server.prisma.sale.findUnique({
            where: { id },
            include: {
                customer: true,
                user: { select: { id: true, name: true, phone: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true, brand: true, barcode: true, price: true } },
                        imei: { select: { id: true, imei: true } },
                    },
                },
            },
        });

        if (!sale) {
            return reply.code(404).send({ message: 'Sale not found' });
        }

        return sale;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const createSale = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const data = createSaleSchema.parse(request.body);
        const userId = (request as any).user.id;

        const sale = await request.server.prisma.$transaction(async (tx: any) => {
            const invoiceNo = await generateInvoiceNo(tx);

            // Create sale with items
            const newSale = await tx.sale.create({
                data: {
                    invoiceNo,
                    customerId: data.customerId || null,
                    userId,
                    subtotal: data.subtotal,
                    discount: data.discount || 0,
                    tax: data.tax || 0,
                    totalAmount: data.totalAmount,
                    paidAmount: data.paidAmount,
                    changeAmount: data.changeAmount || 0,
                    paymentMethod: data.paymentMethod,
                    status: 'COMPLETED',
                    note: data.note || null,
                    items: {
                        create: data.items.map(item => ({
                            productId: item.productId,
                            imeiId: item.imeiId || null,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            discount: item.discount || 0,
                        })),
                    },
                },
                include: {
                    customer: { select: { id: true, name: true } },
                    items: {
                        include: {
                            product: { select: { id: true, name: true } },
                        },
                    },
                },
            });

            // Decrement stock for each item
            for (const item of data.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.quantity } },
                });

                // Mark IMEI as sold
                if (item.imeiId) {
                    await tx.iMEI.update({
                        where: { id: item.imeiId },
                        data: { status: 'SOLD' },
                    });
                }
            }

            return newSale;
        });

        return reply.code(201).send(sale);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return reply.code(400).send({ message: 'Validation failed', errors: error.issues });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const voidSale = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
        const id = parseInt(request.params.id);

        const sale = await request.server.prisma.sale.findUnique({
            where: { id },
            include: { items: true },
        });

        if (!sale) {
            return reply.code(404).send({ message: 'Sale not found' });
        }

        if (sale.status !== 'COMPLETED') {
            return reply.code(400).send({ message: `Cannot void a ${sale.status.toLowerCase()} sale` });
        }

        await request.server.prisma.$transaction(async (tx: any) => {
            // Restore stock
            for (const item of sale.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { increment: item.quantity } },
                });

                // Restore IMEI to IN_STOCK
                if (item.imeiId) {
                    await tx.iMEI.update({
                        where: { id: item.imeiId },
                        data: { status: 'IN_STOCK' },
                    });
                }
            }

            await tx.sale.update({
                where: { id },
                data: { status: 'VOIDED' },
            });
        });

        return { message: 'Sale voided and stock restored' };
    } catch (error: any) {
        if (error.code === 'P2025') {
            return reply.code(404).send({ message: 'Sale not found' });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const refundSale = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
        const id = parseInt(request.params.id);

        const sale = await request.server.prisma.sale.findUnique({
            where: { id },
            include: { items: true },
        });

        if (!sale) {
            return reply.code(404).send({ message: 'Sale not found' });
        }

        if (sale.status !== 'COMPLETED') {
            return reply.code(400).send({ message: `Cannot refund a ${sale.status.toLowerCase()} sale` });
        }

        await request.server.prisma.$transaction(async (tx: any) => {
            // Restore stock
            for (const item of sale.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { increment: item.quantity } },
                });

                if (item.imeiId) {
                    await tx.iMEI.update({
                        where: { id: item.imeiId },
                        data: { status: 'IN_STOCK' },
                    });
                }
            }

            await tx.sale.update({
                where: { id },
                data: { status: 'REFUNDED' },
            });
        });

        return { message: 'Sale refunded and stock restored' };
    } catch (error: any) {
        if (error.code === 'P2025') {
            return reply.code(404).send({ message: 'Sale not found' });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};
