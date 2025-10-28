import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

const ITEMS_PER_PAGE = 6;

// GET all items (optionally filtered by query string)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  // Build the Prisma where filter
  const where = query
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

  const totalCount = await prisma.item.count({ where });
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const skip = (page - 1) * ITEMS_PER_PAGE;

  const items = await prisma.item.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: ITEMS_PER_PAGE,
    skip,
  });

  return NextResponse.json({ items, totalPages });
}

// POST new item
export async function POST(req: Request) {
    const data = await req.json();
    const item = await prisma.item.create({ data });
    return NextResponse.json(item);
}
