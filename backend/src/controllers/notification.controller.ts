import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

// ── Get Notifications ────────────────────────────────────
export const getNotifications = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const user = request.user as any;
        const { page = '1', limit = '20', unreadOnly } = request.query as any;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where: any = { userId: user.id };
        if (unreadOnly === 'true') where.isRead = false;

        const [data, total, unreadCount] = await Promise.all([
            request.server.prisma.notification.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
            }),
            request.server.prisma.notification.count({ where }),
            request.server.prisma.notification.count({ where: { userId: user.id, isRead: false } }),
        ]);

        return reply.send({ data, total, unreadCount, page: parseInt(page), totalPages: Math.ceil(total / take) });
    } catch (error) {
        return reply.status(500).send({ message: 'Failed to fetch notifications' });
    }
};

// ── Get Unread Count ─────────────────────────────────────
export const getUnreadCount = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const user = request.user as any;
        const count = await request.server.prisma.notification.count({ where: { userId: user.id, isRead: false } });
        return reply.send({ count });
    } catch (error) {
        return reply.status(500).send({ message: 'Failed' });
    }
};

// ── Mark as Read ─────────────────────────────────────────
export const markAsRead = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const user = request.user as any;
        const { id } = request.params as any;
        await request.server.prisma.notification.update({
            where: { id: parseInt(id), userId: user.id },
            data: { isRead: true },
        });
        return reply.send({ message: 'Marked as read' });
    } catch (error) {
        return reply.status(500).send({ message: 'Failed' });
    }
};

// ── Mark All as Read ─────────────────────────────────────
export const markAllAsRead = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const user = request.user as any;
        await request.server.prisma.notification.updateMany({
            where: { userId: user.id, isRead: false },
            data: { isRead: true },
        });
        return reply.send({ message: 'All marked as read' });
    } catch (error) {
        return reply.status(500).send({ message: 'Failed' });
    }
};

// ── Delete Notification ──────────────────────────────────
export const deleteNotification = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const user = request.user as any;
        const { id } = request.params as any;
        await request.server.prisma.notification.delete({
            where: { id: parseInt(id), userId: user.id },
        });
        return reply.send({ message: 'Deleted' });
    } catch (error) {
        return reply.status(500).send({ message: 'Failed' });
    }
};

// ── Create Notification (helper) ─────────────────────────
export const createNotification = async (
    prisma: any,
    { userId, title, message, type }: { userId: number; title: string; message: string; type: string }
) => {
    try {
        await prisma.notification.create({ data: { userId, title, message, type } });
    } catch (e) {
        console.error('Notification create error:', e);
    }
};
