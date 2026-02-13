import { FastifyInstance } from 'fastify';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/user.controller';
import { requireRole } from '../middleware/role';

export default async function userRoutes(fastify: FastifyInstance) {
    fastify.addHook('onRequest', fastify.authenticate);

    // Only ADMIN can manage users
    fastify.register(async (adminRoutes) => {
        adminRoutes.addHook('onRequest', requireRole(['ADMIN']));

        adminRoutes.get('/', getUsers);
        adminRoutes.post('/', createUser);
        adminRoutes.put('/:id', updateUser);
        adminRoutes.delete('/:id', deleteUser);
    });
}
