import { Prisma } from '@prisma/client';

export type Item = Prisma.ItemGetPayload<{ include: { categories: true } }>;
export type Transaction = Prisma.TransactionGetPayload<{ include: { items: true } }>;
export type Category = Prisma.CategoryGetPayload<{ include: { items: true } }>;
export type ItemWithCategories = Prisma.ItemGetPayload<{
  include: { categories: true };
}>;

export type TransactionWithItems = Prisma.TransactionGetPayload<{
  include: { items: true };
}>;

export type TransactionWithItemsAndCategories = Prisma.TransactionGetPayload<{
  include: { items: { include: { categories: true } } };
}>;

export type Admin = Prisma.AdminGetPayload<{}>;
