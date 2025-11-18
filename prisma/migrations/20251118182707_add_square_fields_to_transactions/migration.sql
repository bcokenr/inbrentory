-- CreateEnum
CREATE TYPE "TransactionPaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELED', 'FAILED', 'REFUNDED');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "paymentStatus" "TransactionPaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "receiptUrl" TEXT,
ADD COLUMN     "squareCheckoutId" TEXT,
ADD COLUMN     "squareLocationId" TEXT,
ADD COLUMN     "squareOrderId" TEXT,
ADD COLUMN     "squarePaymentId" TEXT;
