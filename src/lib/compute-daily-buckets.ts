import { format, addDays } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { DEFAULT_TZ } from '../config/timezone';

export type DailyRow = { date: string; storeTotal: number; depopTotal: number; total: number };

export function computeDailyBucketsFromItems(
  items: any[],
  zonedStart: Date,
  zonedEnd: Date,
  timeZone: string = DEFAULT_TZ
): DailyRow[] {
  const buckets: Record<string, { store: number; depop: number }> = {};

  const toLocalDateKey = (d: Date) => {
    const zoned = utcToZonedTime(d, timeZone);
    return format(zoned, 'yyyy-MM-dd');
  };

  // Group items by transaction id to distribute store credit proportionally
  const txGroups: Record<string, { txDate: Date; storeCredit: number; items: Array<{ price: number; soldOnDepop: boolean }> }> = {};
  for (const it of items) {
    const tx = (it as any).transaction;
    const txDate = tx?.createdAt;
    if (!txDate) continue;
    const txId = String(tx.id || '');
    const price = Number((it as any).transactionPrice ?? (it as any).discountedListPrice ?? (it as any).listPrice ?? 0) || 0;
    const soldOnDepop = Boolean((it as any).soldOnDepop);
    if (!txGroups[txId]) txGroups[txId] = { txDate, storeCredit: Number(tx.storeCreditAmountApplied ?? 0) || 0, items: [] };
    txGroups[txId].items.push({ price, soldOnDepop });
  }

  for (const txId of Object.keys(txGroups)) {
    const group = txGroups[txId];
    const dayKey = toLocalDateKey(group.txDate);
    if (!buckets[dayKey]) buckets[dayKey] = { store: 0, depop: 0 };
    const totalPrice = group.items.reduce((s, it) => s + it.price, 0);
    const credit = Math.max(0, group.storeCredit || 0);
    for (const it of group.items) {
      const deduction = totalPrice > 0 ? (credit * (it.price / totalPrice)) : 0;
      const net = Math.max(0, +(it.price - deduction));
      if (it.soldOnDepop) buckets[dayKey].depop += net;
      else buckets[dayKey].store += net;
    }
  }

  const results: DailyRow[] = [];
  let cursor = zonedStart;
  while (cursor <= zonedEnd) {
    const key = format(utcToZonedTime(cursor, timeZone), 'yyyy-MM-dd');
    const b = buckets[key] || { store: 0, depop: 0 };
    const storeTotal = +(b.store || 0).toFixed(2);
    const depopTotal = +(b.depop || 0).toFixed(2);
    results.push({ date: key, storeTotal, depopTotal, total: +(storeTotal + depopTotal).toFixed(2) });
    // advance one day in the local zoned cursor domain
    cursor = addDays(cursor, 1);
  }

  return results;
}
