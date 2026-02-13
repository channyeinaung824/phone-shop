import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

const createSupplierSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    address: z.string().optional(),
});

const updateSupplierSchema = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    address: z.string().optional(),
});

export const getSuppliers = async (request: FastifyRequest<{ Querystring: { q?: string; page?: string; limit?: string } }>, reply: FastifyReply) => {
    try {
        const { q } = request.query;
        const page = Math.max(1, parseInt(request.query.page || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(request.query.limit || '10', 10)));
        const skip = (page - 1) * limit;

        const where: any = { isDeleted: false };

        if (q) {
            where.OR = [
                { name: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
            ];
        }

        const [suppliers, total] = await Promise.all([
            request.server.prisma.supplier.findMany({
                where,
                orderBy: { name: 'asc' },
                skip,
                take: limit,
            }),
            request.server.prisma.supplier.count({ where }),
        ]);

        return {
            data: suppliers,
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

export const createSupplier = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const data = createSupplierSchema.parse(request.body);

        const supplier = await request.server.prisma.supplier.create({
            data: {
                name: data.name,
                phone: data.phone || null,
                email: data.email || null,
                address: data.address || null,
            },
        });

        return reply.code(201).send(supplier);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return reply.code(400).send({ message: 'Validation failed', errors: error.issues });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const updateSupplier = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
        const id = parseInt(request.params.id);
        const data = updateSupplierSchema.parse(request.body);

        const supplier = await request.server.prisma.supplier.update({
            where: { id },
            data,
        });

        return supplier;
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return reply.code(400).send({ message: 'Validation failed', errors: error.issues });
        }
        if (error.code === 'P2025') {
            return reply.code(404).send({ message: 'Supplier not found' });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const deleteSupplier = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
        const id = parseInt(request.params.id);

        // Soft delete
        await request.server.prisma.supplier.update({
            where: { id },
            data: { isDeleted: true },
        });

        return { message: 'Supplier deleted successfully' };
    } catch (error: any) {
        if (error.code === 'P2025') {
            return reply.code(404).send({ message: 'Supplier not found' });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};
