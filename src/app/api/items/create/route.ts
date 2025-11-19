import { NextResponse } from 'next/server';
import { createItemForCart } from '@/lib/actions';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, listPrice, onDepop, categories } = body;
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
    const item = await createItemForCart({ name, listPrice: Number(listPrice || 0), onDepop: Boolean(onDepop), categories: categories || null });
    return NextResponse.json(item, { status: 200 });
  } catch (err: any) {
    console.error('create item api error', err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
