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
  // Pass the order object so createTerminalCheckout can compute amount and include it
  const checkout = order && await createTerminalCheckout(order);

    if (!checkout) {
      return NextResponse.json({ error: 'Failed to create terminal checkout' }, { status: 500 });
    }

    // Return checkout id and some lightweight info for client UI
    // Sanitize the checkout object for JSON serialization (Square SDK may return BigInt values)
    const sanitizeForJson = (value: any): any => {
      if (value === null || value === undefined) return value;
      if (typeof value === 'bigint') return value.toString();
      if (Array.isArray(value)) return value.map(sanitizeForJson);
      if (typeof value === 'object') {
        const out: any = {};
        for (const k of Object.keys(value)) {
          out[k] = sanitizeForJson(value[k]);
        }
        return out;
      }
      return value;
    };

    const safeCheckout = sanitizeForJson(checkout);
    return NextResponse.json({ checkoutId: String(safeCheckout.id ?? checkout.id), checkout: safeCheckout }, { status: 200 });
  } catch (err: any) {
    console.error('Square checkout creation failed', err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
