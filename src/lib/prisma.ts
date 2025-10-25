import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prevent creating new instances during hot reloads in dev
export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["query", "error", "warn"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// 🔹 Get all items with categories
export const getItemsWithCategories = () => {
  return prisma.item.findMany({
    include: { categories: true },
  });
};

// 🔹 Get all transactions with their items
export const getTransactionsWithItems = () => {
  return prisma.transaction.findMany({
    include: { items: true },
  });
};

// 🔹 Get transactions including items + their categories
export const getTransactionsWithItemsAndCategories = () => {
  return prisma.transaction.findMany({
    include: {
      items: {
        include: { categories: true },
      },
    },
  });
};
