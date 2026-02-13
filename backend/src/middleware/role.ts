import { FastifyReply, FastifyRequest } from 'fastify';

export const requireRole = (roles: string[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const user = request.user;
        if (!user || !roles.includes(user.role)) {
            reply.code(403).send({ message: 'Forbidden: Insufficient permissions' });
        }
    };
};
