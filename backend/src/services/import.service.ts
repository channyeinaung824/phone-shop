import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const importProductsFromExcel = async (buffer: Buffer) => {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    let successCount = 0;
    let failCount = 0;
    const errors: any[] = [];

    for (const row of data as any[]) {
        try {
            // Validate row data (basic check)
            if (!row.Name || !row.Brand || !row.Model || !row.Price || !row.Barcode) {
                throw new Error('Missing required fields (Name, Brand, Model, Price, Barcode)');
            }

            // Check if product exists
            const existing = await prisma.product.findUnique({
                where: { barcode: String(row.Barcode) }
            });

            if (existing) {
                // Update stock if exists? Or skip? Let's skip for now to avoid overwriting price
                throw new Error(`Product with barcode ${row.Barcode} already exists`);
            }

            // Find category
            let categoryId = null;
            if (row.Category) {
                const category = await prisma.category.findFirst({
                    where: { name: { equals: row.Category, mode: 'insensitive' } }
                });
                if (category) {
                    categoryId = category.id;
                } else {
                    // Create category if not exists?
                    const newCat = await prisma.category.create({ data: { name: row.Category } });
                    categoryId = newCat.id;
                }
            }

            await prisma.product.create({
                data: {
                    name: String(row.Name),
                    brand: String(row.Brand),
                    model: String(row.Model),
                    price: Number(row.Price),
                    barcode: String(row.Barcode),
                    stock: Number(row.Stock || 0),
                    categoryId: categoryId,
                }
            });
            successCount++;

        } catch (error: any) {
            failCount++;
            errors.push({ row, error: error.message });
        }
    }

    return { successCount, failCount, errors };
};
