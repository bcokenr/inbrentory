import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Client, Environment } from 'square';
import crypto from 'crypto';
import { parseSquareOrderToTransactionData, updateInventoryFromOrder } from '@/lib/square';

const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || '';
const accessToken = process.env.SQUARE_ACCESS_TOKEN || '';

const client = new Client({ accessToken, environment: Environment.Production });

async function verifySignature(rawBody: string, signatureHeader?: string) {
  if (!signatureKey || !signatureHeader) return false;
  // NOTE: Square's exact verification method may differ; consult Square webhook docs.
  // This implementation uses HMAC-SHA1 over the raw body and compares base64 digest to header.
  const hmac = crypto.createHmac('sha1', signatureKey).update(rawBody).digest('base64');
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signatureHeader));
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-square-signature') || req.headers.get('x-square-hmacsha256-signature') || undefined;

  if (!await verifySignature(rawBody, signature)) {
    console.warn('Square webhook signature verification failed');
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error('Invalid JSON webhook payload', err);
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const eventType: string = payload.type || payload.event_type || '';

  try {
    // Handle terminal.checkout.updated events and payment.updated events
    if (eventType === 'terminal.checkout.updated' || eventType === 'payment.updated') {
      // Attempt to extract checkout or payment id
      const data = payload.data || payload; // some payloads wrap differently

      // If we have a checkout object in the event
      const checkout = data.object?.checkout || data.object?.terminal_checkout || null;

      let paymentId: string | undefined;
      let orderId: string | undefined;
      let checkoutId: string | undefined;

      if (checkout) {
        checkoutId = checkout.id;
        // terminal checkout may carry payment IDs
        paymentId = (checkout.paymentIds && checkout.paymentIds[0]) || undefined;
        orderId = checkout.orderId || undefined;
      } else if (payload.data?.object?.payment) {
        // payment.updated
        paymentId = payload.data.object.payment.id;
        orderId = payload.data.object.payment.orderId || undefined;
      }

      // If we have a payment id, fetch it and proceed
      if (paymentId) {
        const paymentResp = await client.paymentsApi.getPayment(paymentId);
        const payment = paymentResp.result.payment;

        if (!payment) return NextResponse.json({ ok: true }, { status: 200 });

        if (payment.status !== 'COMPLETED') {
          // Not a completed payment; ignore
          return NextResponse.json({ ok: true }, { status: 200 });
        }

        // Guard against duplicate processing
        const already = await prisma.transaction.findFirst({ where: { squarePaymentId: payment.id } });
        if (already) return NextResponse.json({ ok: true }, { status: 200 });

        // Retrieve order for line items and totals
        if (!orderId && payment.orderId) orderId = payment.orderId;
        let order: any = null;
        if (orderId) {
          const orderResp = await client.ordersApi.retrieveOrder(orderId);
          order = orderResp.result.order;
        }

        // Parse order into transaction data (subtotal/total and a list of items)
        const txData = await parseSquareOrderToTransactionData(order ?? { lineItems: [] });

        // Create Transaction in Prisma
        const tx = await prisma.transaction.create({
          data: {
            subtotal: txData.subtotal || 0,
            total: txData.total || txData.subtotal || 0,
            squareOrderId: orderId,
            squarePaymentId: payment.id,
            squareCheckoutId: checkoutId,
            paymentStatus: 'COMPLETED',
            storeCreditAmountApplied: txData.storeCreditAmountApplied || 0,
            receiptUrl: payment.receiptUrl || undefined,
            // items will be linked later
            // createdAt will default to now(); you may prefer payment.created_at
          },
        });

        // Map line items to internal items (we embed internal id as note: itemId:<id>) and attach them to the created transaction
        if (order && Array.isArray(order.lineItems)) {
          for (const li of order.lineItems) {
            let itemId: string | undefined;
            if (li.note && typeof li.note === 'string' && li.note.startsWith('itemId:')) itemId = li.note.split(':')[1];
            if (!itemId) continue;

            const item = await prisma.item.findUnique({ where: { id: itemId } });
            if (!item) continue;

            // Update the item to link to transaction and set sale fields
            await prisma.item.update({
              where: { id: item.id },
              data: {
                transactionId: tx.id,
                transactionPrice: (li.basePriceMoney?.amount ?? 0) / 100,
                transactionDate: payment.createdAt ? new Date(payment.createdAt) : undefined,
                soldOnDepop: true,
              },
            });
          }
        }

        // Decrement inventory quantities where applicable
        if (order) {
          try {
            await updateInventoryFromOrder(order);
          } catch (e) {
            console.warn('Failed to update inventory from order', e);
          }
        }

        return NextResponse.json({ ok: true }, { status: 200 });
      }
    }

    // Unhandled event types: acknowledge
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error('Error handling Square webhook', err);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
