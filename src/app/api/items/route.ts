import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const ITEMS_PER_PAGE = 8;

// GET all items (optionally filtered by query string)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  // only filter printed items if query param is provided
  const includePrinted = searchParams.get("includePrinted") ? searchParams.get("includePrinted") === "true" : true;

  // Build the Prisma where filter
  const baseWhere = query
    ? {
      OR: [
        { name: { contains: query, mode: "insensitive" as const } },
        { description: { contains: query, mode: "insensitive" as const } },
        { keywords: { contains: query, mode: "insensitive" as const } },
        { measurements: { contains: query, mode: "insensitive" as const } },
        {
          categories: {
            some: { name: { contains: query, mode: "insensitive" as const } },
          },
        },
      ],
    }
    : {};

  const where = {
    ...baseWhere,
    ...(includePrinted ? {} : { hasPrintedTag: false }),
  };
  const totalCount = await prisma.item.count({ where });
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const skip = (page - 1) * ITEMS_PER_PAGE;

  const items = await prisma.item.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: ITEMS_PER_PAGE,
    skip,
    include: {
      categories: true,
      transaction: true,
    }
  });

  return NextResponse.json({ items, totalPages });
}

// POST new item
export async function POST(req: Request) {
  const data = await req.json();
  const item = await prisma.item.create({ data });
  return NextResponse.json(item);
}
