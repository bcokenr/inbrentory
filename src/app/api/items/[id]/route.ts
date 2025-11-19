import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, context: any) {
  const { params } = context ?? {};
  // Note: Next.js route handlers pass params when using dynamic segments under /app.
  try {
    // If params not provided (edge case), parse from URL
    const id = params?.id ?? new URL(req.url).pathname.split('/').pop();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const item = await prisma.item.findUnique({ where: { id }, select: { id: true, name: true, listPrice: true, transactionPrice: true } });
    if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json(item, { status: 200 });
  } catch (err: any) {
    console.error('Item fetch error', err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
