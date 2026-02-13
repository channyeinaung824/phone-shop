-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "additionalExpenses" JSONB,
ADD COLUMN     "creditAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
ADD COLUMN     "reduceAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;
