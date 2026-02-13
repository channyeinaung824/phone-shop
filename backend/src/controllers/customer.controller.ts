import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

const createCustomerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().min(9, 'Phone must be at least 9 characters'),
    email: z.string().email().optional().or(z.literal('')),
    address: z.string().optional(),
    note: z.string().optional(),
});

const updateCustomerSchema = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().min(9).optional(),
    email: z.string().email().optional().or(z.literal('')),
    address: z.string().optional(),
    note: z.string().optional(),
});

export const getCustomers = async (request: FastifyRequest<{ Querystring: { q?: string; page?: string; limit?: string } }>, reply: FastifyReply) => {
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

        const [customers, total] = await Promise.all([
            request.server.prisma.customer.findMany({
                where,
                orderBy: { name: 'asc' },
                skip,
                take: limit,
            }),
            request.server.prisma.customer.count({ where }),
        ]);

        return {
            data: customers,
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

export const createCustomer = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const data = createCustomerSchema.parse(request.body);

        // Check for duplicate phone
        const existing = await request.server.prisma.customer.findUnique({
            where: { phone: data.phone },
        });

        if (existing) {
            if (existing.isDeleted) {
                // Reactivate soft-deleted customer
                const customer = await request.server.prisma.customer.update({
                    where: { id: existing.id },
                    data: { ...data, email: data.email || null, isDeleted: false },
                });
                return reply.code(201).send(customer);
            }
            return reply.code(409).send({ message: 'Customer with this phone already exists' });
        }

        const customer = await request.server.prisma.customer.create({
            data: {
                name: data.name,
                phone: data.phone,
                email: data.email || null,
                address: data.address || null,
                note: data.note || null,
            },
        });

        return reply.code(201).send(customer);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return reply.code(400).send({ message: 'Validation failed', errors: error.issues });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const updateCustomer = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
        const id = parseInt(request.params.id);
        const data = updateCustomerSchema.parse(request.body);

        if (data.phone) {
            const existing = await request.server.prisma.customer.findFirst({
                where: { phone: data.phone, id: { not: id }, isDeleted: false },
            });
            if (existing) {
                return reply.code(409).send({ message: 'Phone number already in use by another customer' });
            }
        }

        const customer = await request.server.prisma.customer.update({
            where: { id },
            data: { ...data, email: data.email || null },
        });

        return customer;
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return reply.code(400).send({ message: 'Validation failed', errors: error.issues });
        }
        if (error.code === 'P2025') {
            return reply.code(404).send({ message: 'Customer not found' });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const deleteCustomer = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
        const id = parseInt(request.params.id);

        // Soft delete
        await request.server.prisma.customer.update({
            where: { id },
            data: { isDeleted: true },
        });

        return { message: 'Customer deleted successfully' };
    } catch (error: any) {
        if (error.code === 'P2025') {
            return reply.code(404).send({ message: 'Customer not found' });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};
