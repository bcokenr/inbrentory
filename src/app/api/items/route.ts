import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

// GET all items (optionally filtered by query string)
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    const where: Prisma.ItemWhereInput = query
        ? {
            OR: [
                { name: { contains: query, mode: "insensitive" as const } },
                { description: { contains: query, mode: "insensitive" as const } },
                { keywords: { contains: query, mode: "insensitive" as const } },
                { measurements: { contains: query, mode: "insensitive" as const } },
                {
                    categories: {
                        some: {
                            name: { contains: query, mode: 'insensitive' },
                        },
                    },
                },
            ],
        }
        : {};

    const items = await prisma.item.findMany({
        where,
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(items);
}

// POST new item
export async function POST(req: Request) {
    const data = await req.json();
    const item = await prisma.item.create({ data });
    return NextResponse.json(item);
}
