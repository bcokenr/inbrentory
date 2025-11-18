import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const checkoutId = url.searchParams.get('checkoutId');
  if (!checkoutId) return NextResponse.json({ error: 'checkoutId required' }, { status: 400 });

  try {
    const tx = await prisma.transaction.findFirst({ where: { squareCheckoutId: checkoutId } as any });
    if (!tx) return NextResponse.json({ status: 'PENDING' }, { status: 200 });
    return NextResponse.json({ status: tx.paymentStatus || 'COMPLETED', transactionId: tx.id }, { status: 200 });
  } catch (err: any) {
    console.error('Status check error', err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
