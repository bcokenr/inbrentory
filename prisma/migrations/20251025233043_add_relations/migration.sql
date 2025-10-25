/*
  Warnings:

  - You are about to alter the column `listPrice` on the `Item` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `discountedListPrice` on the `Item` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `transactionPrice` on the `Item` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `costBasis` on the `Item` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `storeCreditAmountApplied` on the `Item` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to drop the column `date` on the `Transaction` table. All the data in the column will be lost.
  - You are about to alter the column `total` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to drop the `_ItemCategories` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."_ItemCategories" DROP CONSTRAINT "_ItemCategories_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_ItemCategories" DROP CONSTRAINT "_ItemCategories_B_fkey";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Item" ALTER COLUMN "listPrice" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "discountedListPrice" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "transactionPrice" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "costBasis" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "storeCreditAmountApplied" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "date",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "total" SET DATA TYPE DECIMAL(10,2);

-- DropTable
DROP TABLE "public"."_ItemCategories";

-- CreateTable
CREATE TABLE "ItemCategory" (
    "itemId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "ItemCategory_pkey" PRIMARY KEY ("itemId","categoryId")
);

-- CreateIndex
CREATE INDEX "Item_transactionId_idx" ON "Item"("transactionId");

-- AddForeignKey
ALTER TABLE "ItemCategory" ADD CONSTRAINT "ItemCategory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCategory" ADD CONSTRAINT "ItemCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
