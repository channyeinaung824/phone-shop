import { FastifyInstance } from 'fastify';
import { login, logout, me } from '../controllers/auth.controller';

export default async function authRoutes(fastify: FastifyInstance) {
    fastify.post('/login', login);
    fastify.post('/logout', logout);
    fastify.get('/me', { onRequest: [fastify.authenticate] }, me);
}
