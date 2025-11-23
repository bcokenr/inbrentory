import { format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { DEFAULT_TZ } from '../config/timezone';

export type MonthlyRow = {
  date: string; // YYYY-MM-01
  storeTotal: number;
  depopTotal: number;
  total: number;
  count: number;
};

export async function computeMonthlyBucketsFromItems(
  items: any[],
  year: number,
  timeZone: string = DEFAULT_TZ
): Promise<MonthlyRow[]> {
  const buckets: Record<string, { store: number; depop: number; count: number }> = {};

  const toMonthKey = (d: Date) => {
    const zoned = utcToZonedTime(d, timeZone);
    return format(zoned, 'yyyy-MM-01');
  };

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
    const key = toMonthKey(group.txDate);
    if (!buckets[key]) buckets[key] = { store: 0, depop: 0, count: 0 };
    const totalPrice = group.items.reduce((s, it) => s + it.price, 0);
    const credit = Math.max(0, group.storeCredit || 0);
    for (const it of group.items) {
      const deduction = totalPrice > 0 ? (credit * (it.price / totalPrice)) : 0;
      const net = Math.max(0, +(it.price - deduction));
      if (it.soldOnDepop) {
        buckets[key].depop += net;
      } else {
        buckets[key].store += net;
      }
      buckets[key].count += 1;
    }
  }

  const results: MonthlyRow[] = [];
  for (let m = 0; m < 12; m++) {
    const dt = new Date(year, m, 1);
    const key = format(utcToZonedTime(dt, timeZone), 'yyyy-MM-01');
    const b = buckets[key] || { store: 0, depop: 0, count: 0 };
    const storeTotal = +(b.store || 0).toFixed(2);
    const depopTotal = +(b.depop || 0).toFixed(2);
    results.push({
      date: key,
      storeTotal,
      depopTotal,
      total: +(storeTotal + depopTotal).toFixed(2),
      count: b.count || 0,
    });
  }

  return results;
}
