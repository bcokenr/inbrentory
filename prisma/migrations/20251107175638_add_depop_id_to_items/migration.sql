/*
  Warnings:

  - A unique constraint covering the columns `[depopId]` on the table `Item` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "depopId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Item_depopId_key" ON "Item"("depopId");
