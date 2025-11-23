import { describe, it, expect } from 'vitest';
import { computeMonthlyBucketsFromItems } from '../src/lib/compute-monthly-buckets';

describe('computeMonthlyBucketsFromItems', () => {
  it('buckets a single-item transaction without credit into the correct month', async () => {
    const items = [
      {
        transaction: { id: 'tx1', createdAt: new Date('2025-03-15T12:00:00Z'), storeCreditAmountApplied: null },
        transactionPrice: 50,
        soldOnDepop: false,
      },
    ];

    const results = await computeMonthlyBucketsFromItems(items as any[], 2025, 'UTC');
  const march = results.find((r: any) => r.date === '2025-03-01');
    expect(march).toBeDefined();
    expect(march!.storeTotal).toBeCloseTo(50);
    expect(march!.depopTotal).toBeCloseTo(0);
    expect(march!.count).toBe(1);
  });

  it('applies store credit to a single-item transaction', async () => {
    const items = [
      {
        transaction: { id: 'tx2', createdAt: new Date('2025-06-05T08:00:00Z'), storeCreditAmountApplied: 10 },
        transactionPrice: 50,
        soldOnDepop: false,
      },
    ];

    const results = await computeMonthlyBucketsFromItems(items as any[], 2025, 'UTC');
  const june = results.find((r: any) => r.date === '2025-06-01');
    expect(june).toBeDefined();
    // 50 - 10 = 40
    expect(june!.storeTotal).toBeCloseTo(40);
    expect(june!.depopTotal).toBeCloseTo(0);
    expect(june!.count).toBe(1);
  });

  it('distributes store credit proportionally across multiple items in a transaction', async () => {
    const items = [
      {
        transaction: { id: 'tx3', createdAt: new Date('2025-01-20T10:00:00Z'), storeCreditAmountApplied: 20 },
        transactionPrice: 30,
        soldOnDepop: false,
      },
      {
        transaction: { id: 'tx3', createdAt: new Date('2025-01-20T10:00:00Z'), storeCreditAmountApplied: 20 },
        transactionPrice: 70,
        soldOnDepop: true,
      },
    ];

    const results = await computeMonthlyBucketsFromItems(items as any[], 2025, 'UTC');
  const jan = results.find((r: any) => r.date === '2025-01-01');
  expect(jan).toBeDefined();
    // total price 100, credit 20
    // item1 net = 30 - (20 * 30/100) = 30 - 6 = 24
    // item2 net = 70 - (20 * 70/100) = 70 - 14 = 56
    expect(jan!.storeTotal).toBeCloseTo(24);
    expect(jan!.depopTotal).toBeCloseTo(56);
    expect(jan!.count).toBe(2);
  });
});
