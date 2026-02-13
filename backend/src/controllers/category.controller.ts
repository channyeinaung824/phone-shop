import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

const createCategorySchema = z.object({
    name: z.string().min(1, 'Name is required'),
});

export const createCategory = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const data = createCategorySchema.parse(request.body);
        const category = await request.server.prisma.category.create({
            data,
        });
        return reply.code(201).send(category);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return reply.code(400).send({ message: 'Validation failed', errors: error.issues });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const getCategories = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const categories = await request.server.prisma.category.findMany({
            orderBy: { name: 'asc' }
        });
        return categories;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const updateCategory = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
        const id = Number(request.params.id);
        const data = createCategorySchema.parse(request.body);

        const category = await request.server.prisma.category.update({
            where: { id },
            data: { name: data.name },
        });
        return category;
    } catch (error: any) {
        if (error.code === 'P2025') {
            return reply.code(404).send({ message: 'Category not found' });
        }
        if (error instanceof z.ZodError) {
            return reply.code(400).send({ message: 'Validation failed', errors: error.issues });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};

export const deleteCategory = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
        const id = Number(request.params.id);

        // Check for related products
        const productCount = await request.server.prisma.product.count({
            where: { categoryId: id }
        });

        if (productCount > 0) {
            return reply.code(409).send({ message: 'Cannot delete category with existing products' });
        }

        await request.server.prisma.category.delete({
            where: { id },
        });
        return reply.code(204).send();
    } catch (error: any) {
        if (error.code === 'P2025') {
            return reply.code(404).send({ message: 'Category not found' });
        }
        request.log.error(error);
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
};
