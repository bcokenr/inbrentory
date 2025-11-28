import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Client, Environment } from 'square';
import crypto from 'crypto';
import { parseSquareOrderToTransactionData, updateInventoryFromOrder } from '@/lib/square';

const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || '';
const accessToken = process.env.SQUARE_ACCESS_TOKEN || '';
const environment = process.env.SQUARE_ENV === "sandbox" ? Environment.Sandbox : Environment.Production;
console.log('Square webhook using environment:', environment);
const client = new Client({ accessToken, environment });
const allowInsecure = (process.env.ALLOW_INSECURE_WEBHOOKS === 'true') && process.env.NODE_ENV !== 'production';

async function verifySignature(buf: Buffer, sigSha1?: string | null, sigSha256?: string | null) {
  if (!signatureKey) {
    console.warn('SQUARE_WEBHOOK_SIGNATURE_KEY is not set');
    // If explicitly allowed in dev, skip verification (useful for local testing)
    if (allowInsecure) {
      console.warn('ALLOW_INSECURE_WEBHOOKS=true: skipping signature verification (dev only)');
      return true;
    }
    return false;
  }
  // Deterministic verification: Square (sandbox & modern subscriptions)
  // signs the notification URL concatenated with the raw body using HMAC-SHA256.
  // We'll build the same input and compare against the x-square-hmacsha256-signature
  // header. For compatibility, fall back to HMAC-SHA1 against x-square-signature.
  const notifUrl = (process.env.SQUARE_WEBHOOK_NOTIFICATION_URL || '').trim();
  // Construct input: URL + body (if notifUrl is provided), otherwise just body.
  const inputBuf = notifUrl ? Buffer.concat([Buffer.from(notifUrl, 'utf8'), buf]) : buf;

  if (sigSha256) {
    try {
      const hmac256 = crypto.createHmac('sha256', signatureKey).update(inputBuf).digest('base64');
      const a = Buffer.from(hmac256, 'utf8');
      const b = Buffer.from(sigSha256, 'utf8');
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
    } catch (e) {
      console.warn('Square webhook verification sha256 error', String(e));
    }
  }

  if (sigSha1) {
    try {
      const hmac1 = crypto.createHmac('sha1', signatureKey).update(inputBuf).digest('base64');
      const a1 = Buffer.from(hmac1, 'utf8');
      const b1 = Buffer.from(sigSha1, 'utf8');
      if (a1.length === b1.length && crypto.timingSafeEqual(a1, b1)) return true;
    } catch (e) {
      console.warn('Square webhook verification sha1 error', String(e));
    }
  }

  return false;
}

export async function POST(req: Request) {
  // Read raw bytes to ensure exact HMAC computation
  const arrayBuf = await req.arrayBuffer();
  const buf = Buffer.from(arrayBuf);

  const sigSha1 = req.headers.get('x-square-signature');
  const sigSha256 = req.headers.get('x-square-hmacsha256-signature');

  // NOTE: signature headers are read below; avoid noisy debug logs in production

  if (!await verifySignature(buf, sigSha1, sigSha256)) {
    console.warn('Square webhook signature verification failed');
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let payload: any;
  try {
    const raw = buf.toString('utf8');
    payload = JSON.parse(raw);
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

  // Dev-mode helpers: when ALLOW_INSECURE_WEBHOOKS=true and payload includes full payment/order
  // use those instead of calling Square APIs. This enables local testing without making live
  // Square API calls. This branch only activates when allowInsecure is true (NODE_ENV !== 'production').
  const payloadPayment = data.object?.payment || data.object?.payment_data || null;
  const payloadOrder = data.object?.order || data.object?.checkout?.order || null;

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
        let payment: any = null;

        // Use payload-provided payment object if present and insecure dev mode is enabled
        if (allowInsecure && payloadPayment) {
          payment = payloadPayment;
          // Ensure the id matches if provided
          if (!payment.id) payment.id = paymentId;
        } else {
          try {
            const paymentResp = await client.paymentsApi.getPayment(paymentId);
            payment = paymentResp.result.payment;
          } catch (e: any) {
            const code = e?.statusCode || e?.status || null;
            if (code === 404) {
              console.info('Square webhook: payment not found (404), acknowledging', paymentId);
              return NextResponse.json({ ok: true }, { status: 200 });
            }
            if (code === 401) {
              console.warn('Square webhook: Square API unauthorized (401). Check SQUARE_ACCESS_TOKEN.');
              return NextResponse.json({ ok: true }, { status: 200 });
            }
            console.error('Square webhook: error fetching payment', String(e));
            return NextResponse.json({ ok: false }, { status: 500 });
          }
        }

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
        if (allowInsecure && payloadOrder) {
          order = payloadOrder;
        } else if (orderId) {
          try {
            const orderResp = await client.ordersApi.retrieveOrder(orderId);
            order = orderResp.result.order;
          } catch (e: any) {
            const code = e?.statusCode || e?.status || null;
            if (code === 404) {
              console.info('Square webhook: order not found (404), continuing without order', orderId);
              order = null;
            } else if (code === 401) {
              console.warn('Square webhook: Square API unauthorized (401) when retrieving order.');
              return NextResponse.json({ ok: true }, { status: 200 });
            } else {
              console.error('Square webhook: error retrieving order', String(e));
              return NextResponse.json({ ok: false }, { status: 500 });
            }
          }
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
