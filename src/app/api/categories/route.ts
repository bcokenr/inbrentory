import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";


// GET all categories
export async function GET(req: Request) {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ categories });
}

// POST new category
export async function POST(req: Request) {
    const data = await req.json();
    const category = await prisma.category.create({ data });
    return NextResponse.json(category);
}
