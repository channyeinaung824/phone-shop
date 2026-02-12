import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import healthRoutes from './routes/health';
import prismaPlugin from './plugins/prisma';

const app: FastifyInstance = Fastify({
    logger: true
});

// Register plugins
app.register(cors);
app.register(helmet);
app.register(prismaPlugin);

// Register routes
app.register(healthRoutes);

// Run the server
const start = async () => {
    try {
        const port = parseInt(process.env.PORT || '3001', 10);
        await app.listen({ port, host: '0.0.0.0' });
        console.log(`Server is running on port ${port}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
