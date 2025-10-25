import { Prisma } from "@prisma/client";

export type ItemWithCategories = Prisma.ItemGetPayload<{
  include: { categories: true };
}>;

export type TransactionWithItems = Prisma.TransactionGetPayload<{
  include: { items: true };
}>;

export type TransactionWithItemsAndCategories = Prisma.TransactionGetPayload<{
  include: { items: { include: { categories: true } } };
}>;
