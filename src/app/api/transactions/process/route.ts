import { NextResponse } from 'next/server';
import { createTransaction } from '@/lib/actions';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const itemIds = body?.itemIds;
    const storeCredit = body?.storeCreditAmount ?? body?.storeCredit ?? 0;
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'No itemIds provided' }, { status: 400 });
    }

  // Accept an optional createdAt timestamp (ISO string) to preserve canonical timestamps
  const createdAt = body?.createdAt ? new Date(body.createdAt) : undefined;

  const tx = await createTransaction(itemIds, storeCredit ? Number(storeCredit) : 0, createdAt);
    return NextResponse.json({ success: true, transactionId: tx.id });
  } catch (error) {
    console.error('Error processing transaction', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
