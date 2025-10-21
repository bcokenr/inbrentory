/*
  Warnings:

  - Made the column `description` on table `Item` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Item` MODIFY `description` MEDIUMTEXT NOT NULL;
