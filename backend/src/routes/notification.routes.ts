import { FastifyInstance } from 'fastify';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification } from '../controllers/notification.controller';

async function notificationRoutes(fastify: FastifyInstance) {
    fastify.get('/', { preHandler: [(fastify as any).authenticate] }, getNotifications);
    fastify.get('/unread-count', { preHandler: [(fastify as any).authenticate] }, getUnreadCount);
    fastify.put('/:id/read', { preHandler: [(fastify as any).authenticate] }, markAsRead);
    fastify.put('/read-all', { preHandler: [(fastify as any).authenticate] }, markAllAsRead);
    fastify.delete('/:id', { preHandler: [(fastify as any).authenticate] }, deleteNotification);
}

export default notificationRoutes;
