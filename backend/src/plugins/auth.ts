import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import { FastifyReply, FastifyRequest } from 'fastify';

declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        authorize: (roles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}

declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: { id: number; role: string; name: string };
        user: { id: number; role: string; name: string };
    }
}

export default fp(async (fastify) => {
    fastify.register(fastifyJwt, {
        secret: process.env.JWT_SECRET || 'supersecret',
        cookie: {
            cookieName: 'token',
            signed: false,
        },
    });

    fastify.register(fastifyCookie);

    fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            await request.jwtVerify();
        } catch (err) {
            reply.send(err);
        }
    });

    fastify.decorate('authorize', (roles: string[]) => async (request: FastifyRequest, reply: FastifyReply) => {
        const user = request.user;
        if (!user || !roles.includes(user.role)) {
            reply.code(403).send({ message: 'Forbidden' });
        }
    });
});
