import { NextResponse } from 'next/server';
import { createSquareOrder, createTerminalCheckout, CartLineItem } from '@/lib/square';

export async function POST(req: Request) {
  const body = await req.json();
  const { lineItems, storeCreditAmount } = body as { lineItems: CartLineItem[]; storeCreditAmount?: number };

  if (!lineItems || !Array.isArray(lineItems)) {
    return NextResponse.json({ error: 'lineItems required' }, { status: 400 });
  }

  try {
    const order = await createSquareOrder(lineItems, storeCreditAmount || 0);
    const checkout = order.id && await createTerminalCheckout(order.id);

    if (!checkout) {
      return NextResponse.json({ error: 'Failed to create terminal checkout' }, { status: 500 });
    }
    
    // Return checkout id and some lightweight info for client UI
    return NextResponse.json({ checkoutId: checkout.id, checkout }, { status: 200 });
  } catch (err: any) {
    console.error('Square checkout creation failed', err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
