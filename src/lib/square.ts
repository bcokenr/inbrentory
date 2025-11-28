"use server";

import { Client, Environment } from "square";
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/prisma';
import { DEFAULT_TZ } from '@/config/timezone';
import { zonedTimeToUtc } from 'date-fns-tz';

const accessToken = process.env.SQUARE_ACCESS_TOKEN || '';
const locationId = process.env.SQUARE_LOCATION_ID || '';
const sqEnv = process.env.SQUARE_ENV === 'sandbox' ? Environment.Sandbox : Environment.Production;

if (!accessToken) {
  // In real deployments, fail fast or log appropriately
  console.warn('SQUARE_ACCESS_TOKEN is not set. Square API calls will fail.');
}
if (!locationId) {
  console.warn('SQUARE_LOCATION_ID is not set. Orders/checkouts may fail.');
}

const client = new Client({ accessToken, environment: sqEnv });

export type CartLineItem = {
  name: string;
  quantity: number;
  price: number; // in dollars
  sku?: string;
  metadata?: Record<string, string>;
};

export async function createSquareOrder(lineItems: CartLineItem[], storeCreditAmount = 0) {
  // Build line items in Square format (amount in cents)
  const sqLineItems = lineItems.map((li) => ({
    name: li.name,
    quantity: String(li.quantity),
    basePriceMoney: { amount: Math.round(li.price * 100), currency: 'USD' },
    // Embed our internal item id in the note so we can map line items back to internal items
    // Format: itemId:<internalId>
    note: li.sku ? `itemId:${li.sku}` : undefined,
  }));

  // If store credit applies, add a negative line item to reduce total
  if (storeCreditAmount && storeCreditAmount > 0) {
    sqLineItems.push({
      name: 'Store Credit',
      quantity: '1',
      basePriceMoney: { amount: -Math.round(storeCreditAmount * 100), currency: 'USD' },
      note: 'store-credit',
    } as any);
  }

  const idempotencyKey = uuidv4();

  const body: any = {
    idempotencyKey,
    order: {
      locationId,
      lineItems: sqLineItems,
    },
  };

  try {
    const resp = await client.ordersApi.createOrder({ order: body.order, idempotencyKey });
    return resp.result.order!;
  } catch (e: any) {
    console.error('createSquareOrder error', e);
    // Surface a clearer error message upstream
    throw new Error(`Square createOrder failed: ${e?.statusCode || e?.status || e?.message || String(e)}`);
  }
}

export async function createTerminalCheckout(orderOrId: string | any) {
  const idempotencyKey = uuidv4();

  // Determine order object: accept either an order object or an orderId string
  let order: any = null;
  if (typeof orderOrId === 'string') {
    try {
      const orderResp = await client.ordersApi.retrieveOrder(orderOrId);
      order = orderResp.result.order;
    } catch (e: any) {
      console.error('createTerminalCheckout: failed to retrieve order', e);
      throw new Error(`Failed to retrieve order ${orderOrId}: ${e?.statusCode || e?.status || e?.message || String(e)}`);
    }
  } else {
    order = orderOrId;
  }

  if (!order) throw new Error('createTerminalCheckout: order is required');

  // compute amountMoney (in cents) from order netAmounts or fallback to summing line items
  let amountCents: number | null = null;
  if (order.netAmounts && order.netAmounts.totalMoney && typeof order.netAmounts.totalMoney.amount === 'number') {
    amountCents = order.netAmounts.totalMoney.amount;
  } else if (Array.isArray(order.lineItems) && order.lineItems.length > 0) {
    amountCents = 0;
    for (const li of order.lineItems) {
      const qty = Number(li.quantity ?? 1);
      const price = Number(li.basePriceMoney?.amount ?? 0);
      amountCents += qty * price;
    }
  }

  if (amountCents === null) {
    throw new Error('createTerminalCheckout: unable to determine order total amount');
  }

  const amountMoney = { amount: amountCents, currency: 'USD' };

  // Device id must be provided via env for Terminal API.
  const deviceId = process.env.SQUARE_TERMINAL_DEVICE_ID || '';
  if (!deviceId) {
    throw new Error('SQUARE_TERMINAL_DEVICE_ID is not set. Terminal checkout requires a device id.');
  }

  const body: any = {
    idempotencyKey,
    checkout: {
      orderId: order.id,
      locationId,
      amountMoney,
      deviceOptions: { deviceId },
    },
  };

  try {
    const resp = await client.terminalApi.createTerminalCheckout(body);
    return resp.result.checkout!;
  } catch (e: any) {
    console.error('createTerminalCheckout error', e);
    throw new Error(`Square createTerminalCheckout failed: ${e?.statusCode || e?.status || e?.message || String(e)}`);
  }
}

export async function parseSquareOrderToTransactionData(order: any) {
  // Map Square order to the shape we want for creating a Transaction
  const lineItems = order.lineItems ?? [];
  const items: { itemId?: string; name: string; quantity: number; amount: number }[] = [];

  for (const li of lineItems) {
    // Try to extract our internal itemId from note (we store itemId:<id>)
    let itemId: string | undefined;
    if (li.note && typeof li.note === 'string' && li.note.startsWith('itemId:')) itemId = li.note.split(':')[1];

    items.push({
      itemId: itemId || undefined,
      name: li.name,
      quantity: Number(li.quantity || 1),
      amount: Number((li.basePriceMoney?.amount ?? 0) / 100),
    });
  }

  const subtotal = (order.netAmounts?.subtotalMoney?.amount ?? 0) / 100 || 0;
  const storeCreditAmountApplied = lineItems.find((li: any) => li.note === 'store-credit')
    ? -(lineItems.find((li: any) => li.note === 'store-credit')?.basePriceMoney?.amount ?? 0) / 100
    : 0;
  const total = (order.netAmounts?.totalMoney?.amount ?? 0) / 100 || 0;

  return { items, subtotal, total, storeCreditAmountApplied };
}

export async function updateInventoryFromOrder(order: any) {
  // Simple mapping: try to match by internal item id embedded in the line item note
  const lineItems = order.lineItems ?? [];
  for (const li of lineItems) {
    let itemId: string | undefined;
    if (li.note && typeof li.note === 'string' && li.note.startsWith('itemId:')) itemId = li.note.split(':')[1];
    if (!itemId) continue;

    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) continue;

    const qty = Number(li.quantity ?? 1);
    const newQty = Math.max(0, (item.quantity ?? 1) - qty);
    await prisma.item.update({ where: { id: item.id }, data: { quantity: newQty } });
  }
}
