import 'dotenv/config';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import healthRoutes from './routes/health';
import prismaPlugin from './plugins/prisma';

import authPlugin from './plugins/auth';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import categoryRoutes from './routes/category.routes';
import productRoutes from './routes/product.routes';
import supplierRoutes from './routes/supplier.routes';
import customerRoutes from './routes/customer.routes';
import imeiRoutes from './routes/imei.routes';
import purchaseRoutes from './routes/purchase.routes';
import saleRoutes from './routes/sale.routes';
import expenseRoutes from './routes/expense.routes';
import dashboardRoutes from './routes/dashboard.routes';
import warrantyRoutes from './routes/warranty.routes';
import installmentRoutes from './routes/installment.routes';
import repairRoutes from './routes/repair.routes';
import tradeInRoutes from './routes/tradein.routes';

const app: FastifyInstance = Fastify({
    logger: true
});

// Register plugins
app.register(cors, {
    origin: [
        'http://localhost:3000',
        'http://192.168.100.10:3000'
    ], // Allow all origins (reflects the request origin)
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});
app.register(helmet);
app.register(multipart);
app.register(prismaPlugin);
app.register(authPlugin);

// Register routes
app.register(healthRoutes);
app.register(authRoutes, { prefix: '/auth' });

app.register(userRoutes, { prefix: '/users' });
app.register(categoryRoutes, { prefix: '/categories' });
app.register(productRoutes, { prefix: '/products' });
app.register(supplierRoutes, { prefix: '/suppliers' });
app.register(customerRoutes, { prefix: '/customers' });
app.register(imeiRoutes, { prefix: '/imeis' });
app.register(purchaseRoutes, { prefix: '/purchases' });
app.register(saleRoutes, { prefix: '/sales' });
app.register(expenseRoutes, { prefix: '/expenses' });
app.register(dashboardRoutes, { prefix: '/dashboard' });
app.register(warrantyRoutes, { prefix: '/warranties' });
app.register(installmentRoutes, { prefix: '/installments' });
app.register(repairRoutes, { prefix: '/repairs' });
app.register(tradeInRoutes, { prefix: '/trade-ins' });

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
