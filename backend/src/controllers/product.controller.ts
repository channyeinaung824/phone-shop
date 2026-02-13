import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { importProductsFromExcel } from '../services/import.service';

const createProductSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
    brand: z.string().min(1, 'Brand is required').max(50, 'Brand must be at most 50 characters'),
    model: z.string().min(1, 'Model is required').max(50, 'Model must be at most 50 characters'),
    price: z.number().positive('Price must be positive').max(99999999, 'Price is too high'),
    categoryId: z.number().int().positive('Category is required'),
    barcode: z.string().min(1, 'Barcode is required').max(30, 'Barcode must be at most 30 characters'),
    stock: z.number().int().nonnegative().max(10000, 'Stock cannot exceed 10000').default(0),
});

export const createProduct = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const data = createProductSchema.parse(request.body);

        // Check if barcode exists
        const existing = await request.server.prisma.product.findUnique({
            where: { barcode: data.barcode }
        });

        if (existing) {
            return reply.code(409).send({ message: 'Product with this barcode already exists' });
        }

        const product = await request.server.prisma.product.create({
            data,
        });
        return reply.code(201).send(product);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return reply.code(400).send({ message: 'Validation failed', errors: error.issues });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const getProducts = async (request: FastifyRequest<{ Querystring: { q?: string; page?: string; limit?: string; sortBy?: string; sortOrder?: string } }>, reply: FastifyReply) => {
    try {
        const { q, sortBy, sortOrder } = request.query;
        const page = Math.max(1, parseInt(request.query.page || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(request.query.limit || '10', 10)));
        const skip = (page - 1) * limit;

        const where: any = {};

        if (q) {
            where.OR = [
                { name: { contains: q, mode: 'insensitive' } },
                { brand: { contains: q, mode: 'insensitive' } },
                { barcode: { contains: q, mode: 'insensitive' } },
            ];
        }

        const allowedSortFields = ['barcode', 'name', 'brand', 'price', 'stock'];
        const orderBy = sortBy && allowedSortFields.includes(sortBy)
            ? { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' }
            : { name: 'asc' as const };

        const [products, total] = await Promise.all([
            request.server.prisma.product.findMany({
                where,
                include: { category: true },
                orderBy,
                skip,
                take: limit,
            }),
            request.server.prisma.product.count({ where }),
        ]);

        return {
            data: products,
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

export const updateProduct = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
        const id = Number(request.params.id);
        const data = createProductSchema.partial().parse(request.body);

        const product = await request.server.prisma.product.update({
            where: { id },
            data,
        });
        return product;
    } catch (error: any) {
        if (error.code === 'P2025') {
            return reply.code(404).send({ message: 'Product not found' });
        }
        if (error.code === 'P2002') {
            return reply.code(409).send({ message: 'Product with this barcode already exists' });
        }
        if (error instanceof z.ZodError) {
            return reply.code(400).send({ message: 'Validation failed', errors: error.issues });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const deleteProduct = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
        const id = Number(request.params.id);

        await request.server.prisma.product.delete({
            where: { id },
        });
        return reply.code(204).send();
    } catch (error: any) {
        if (error.code === 'P2025') {
            return reply.code(404).send({ message: 'Product not found' });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const importProducts = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const parts = (request as any).parts();
        let fileBuffer: Buffer | null = null;

        for await (const part of parts) {
            if (part.type === 'file') {
                fileBuffer = await part.toBuffer();
                break; // Only process the first file
            }
        }

        if (!fileBuffer) {
            return reply.code(400).send({ message: 'No file uploaded' });
        }

        const result = await importProductsFromExcel(fileBuffer);

        return reply.send({
            message: 'Import processed',
            ...result
        });

    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};
