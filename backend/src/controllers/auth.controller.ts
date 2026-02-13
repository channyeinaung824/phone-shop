import { FastifyReply, FastifyRequest } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { normalizePhone } from '../utils/phone';

export const login = async (request: FastifyRequest, reply: FastifyReply) => {
    const loginSchema = z.object({
        phone: z.string().min(1, 'Phone is required'),
        password: z.string().min(1, 'Password is required'),
    });

    try {
        const { phone, password } = loginSchema.parse(request.body);

        const user = await request.server.prisma.user.findUnique({
            where: { phone },
        });

        if (!user || user.status !== 'ACTIVE') {
            return reply.code(401).send({ message: 'Invalid phone or password' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return reply.code(401).send({ message: 'Invalid phone or password' });
        }

        const token = request.server.jwt.sign({
            id: user.id,
            name: user.name,
            role: user.role,
        });

        reply.setCookie('token', token, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });

        return reply.send({ token, user });
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const logout = async (request: FastifyRequest, reply: FastifyReply) => {
    reply.clearCookie('token', { path: '/' });
    return { message: 'Logged out successfully' };
};

export const me = async (request: FastifyRequest, reply: FastifyReply) => {
    // The user is already attached to the request by the authenticate decorator
    return { user: request.user };
};
