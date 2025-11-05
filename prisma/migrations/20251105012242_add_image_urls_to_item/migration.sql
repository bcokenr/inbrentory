-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
