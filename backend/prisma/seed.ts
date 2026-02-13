import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const adminPhone = '09123456789';
    const adminPassword = 'password123';

    const existingAdmin = await prisma.user.findUnique({
        where: { phone: adminPhone },
    });

    if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await prisma.user.create({
            data: {
                name: 'Super Admin',
                phone: adminPhone,
                password: hashedPassword,
                role: 'ADMIN',
                status: 'ACTIVE',
            },
        });
        console.log(`Admin user created: ${adminPhone} / ${adminPassword}`);
    } else {
        console.log('Admin user already exists');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
