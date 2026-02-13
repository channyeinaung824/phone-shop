import { FastifyReply, FastifyRequest } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { normalizePhone } from '../utils/phone';


const createUserSchema = z.object({
    name: z.string().min(2),
    phone: z.string()
        .transform(val => normalizePhone(val))
        .refine(val => /^09\d{7,9}$/.test(val), 'Phone must start with 09 and contain 9-11 digits'),
    password: z.string().min(6, 'Please enter the password at least 6'),
    role: z.enum(['ADMIN', 'SELLER']),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional().default('ACTIVE'),
});

const updateUserSchema = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional()
        .transform(val => val ? normalizePhone(val) : val)
        .refine(val => !val || /^09\d{7,9}$/.test(val), 'Phone must start with 09 and contain 9-11 digits'),
    password: z.string().min(6).optional()
        .refine((val) => !val || !/[\u1000-\u109F]/.test(val), 'Password cannot contain Myanmar characters'),
    role: z.enum(['ADMIN', 'SELLER']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

export const getUsers = async (request: FastifyRequest<{ Querystring: { page?: string; limit?: string } }>, reply: FastifyReply) => {
    try {
        const page = Math.max(1, parseInt(request.query.page || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(request.query.limit || '10', 10)));
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            request.server.prisma.user.findMany({
                select: { id: true, name: true, phone: true, role: true, status: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            request.server.prisma.user.count(),
        ]);

        return {
            data: users,
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

export const createUser = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const data = createUserSchema.parse(request.body);

        const existingUser = await request.server.prisma.user.findUnique({
            where: { phone: data.phone },
        });

        if (existingUser) {
            return reply.code(409).send({ message: 'User with this phone already exists' });
        }

        // Normalize phone
        const normalizedPhone = normalizePhone(data.phone);

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const user = await request.server.prisma.user.create({
            data: {
                ...data,
                phone: normalizedPhone, // Save normalized phone
                password: hashedPassword,
            },
            select: { id: true, name: true, phone: true, role: true, status: true },
        });

        return user;
    } catch (error: any) {
        request.log.error('BS_ERROR_LOG:', error); // Add specific log prefix to find it easily
        // Check for ZodError by class, name, or presence of issues array
        if (error instanceof z.ZodError || error.name === 'ZodError' || error.issues || Array.isArray(error)) {
            const issues = error.errors || error.issues || error;
            return reply.code(400).send({
                message: 'Validation failed',
                errors: issues
            });
        }
        return reply.code(500).send({ message: 'Internal Server Error', error: error.message || error });
    }
};

export const updateUser = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseInt(request.params.id);
    const data = updateUserSchema.parse(request.body);

    if (data.phone) {
        data.phone = normalizePhone(data.phone);
        // Check if another user has this phone (excluding current user) is a good practice but often omitted if uniqueness constraint handles it (which throws 500 or 409). 
        // Prisma will throw unique constraint failed if we don't check.
        // Let's rely on Prisma error or check explicitly? Explicit is better for message.
        // But for now, let's just normalize.
    }

    if (data.password) {
        data.password = await bcrypt.hash(data.password, 10);
    }

    try {
        const user = await request.server.prisma.user.update({
            where: { id },
            data,
            select: { id: true, name: true, phone: true, role: true, status: true },
        });
        return user;
    } catch (error: any) {
        // Handle unique constraint error P2002
        if (error.code === 'P2002') {
            return reply.code(409).send({ message: 'Phone number already in use' });
        }
        return reply.code(404).send({ message: 'User not found or error updating' });
    }
};

export const deleteUser = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseInt(request.params.id);

    try {
        const userToDelete = await request.server.prisma.user.findUnique({
            where: { id },
        });

        if (!userToDelete) {
            return reply.code(404).send({ message: 'User not found' });
        }

        if (userToDelete.role === 'ADMIN') {
            const adminCount = await request.server.prisma.user.count({
                where: { role: 'ADMIN' },
            });

            if (adminCount <= 1) {
                return reply.code(400).send({ message: 'Cannot delete the last admin user.' });
            }
        }

        await request.server.prisma.user.delete({
            where: { id },
        });
        return { message: 'User deleted successfully' };
    } catch (error) {
        return reply.code(500).send({ message: 'Failed to delete user' });
    }
};
