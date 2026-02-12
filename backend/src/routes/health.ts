import { FastifyPluginAsync } from 'fastify';

const healthRoutes: FastifyPluginAsync = async (fastify, options) => {
    fastify.get('/health', async (request, reply) => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });
};

export default healthRoutes;
