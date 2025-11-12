import { NextResponse } from 'next/server';
import { createTransaction } from '@/lib/actions';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const itemIds = body?.itemIds;
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'No itemIds provided' }, { status: 400 });
    }

    const tx = await createTransaction(itemIds);
    return NextResponse.json({ success: true, transactionId: tx.id });
  } catch (error) {
    console.error('Error processing transaction', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
