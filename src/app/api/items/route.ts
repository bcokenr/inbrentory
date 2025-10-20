import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET all items
export async function GET() {
  const items = await prisma.item.findMany({
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
