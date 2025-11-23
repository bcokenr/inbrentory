import { describe, it, expect } from 'vitest';
import { computeDailyBucketsFromItems } from '../src/lib/compute-daily-buckets';

describe('computeDailyBucketsFromItems', () => {
  it('buckets a single-item transaction without credit into the correct day', () => {
    const items = [
      {
        transaction: { id: 'tx1', createdAt: new Date('2025-03-15T12:00:00Z'), storeCreditAmountApplied: null },
        transactionPrice: 50,
        soldOnDepop: false,
      },
    ];

    const start = new Date('2025-03-15T00:00:00Z');
    const end = new Date('2025-03-15T00:00:00Z');
    const results = computeDailyBucketsFromItems(items as any[], start, end, 'UTC');
    const row = results.find((r: any) => r.date === '2025-03-15');
    expect(row).toBeDefined();
    expect(row!.storeTotal).toBeCloseTo(50);
    expect(row!.depopTotal).toBeCloseTo(0);
    expect(row!.total).toBeCloseTo(50);
  });

  it('applies store credit to a single-item transaction', () => {
    const items = [
      {
        transaction: { id: 'tx2', createdAt: new Date('2025-06-05T08:00:00Z'), storeCreditAmountApplied: 10 },
        transactionPrice: 50,
        soldOnDepop: false,
      },
    ];

    const start = new Date('2025-06-05T00:00:00Z');
    const end = new Date('2025-06-05T00:00:00Z');
    const results = computeDailyBucketsFromItems(items as any[], start, end, 'UTC');
    const row = results.find((r: any) => r.date === '2025-06-05');
    expect(row).toBeDefined();
    // 50 - 10 = 40
    expect(row!.storeTotal).toBeCloseTo(40);
    expect(row!.depopTotal).toBeCloseTo(0);
    expect(row!.total).toBeCloseTo(40);
  });

  it('distributes store credit proportionally across multiple items in a transaction', () => {
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

    const start = new Date('2025-01-20T00:00:00Z');
    const end = new Date('2025-01-20T00:00:00Z');
    const results = computeDailyBucketsFromItems(items as any[], start, end, 'UTC');
    const row = results.find((r: any) => r.date === '2025-01-20');
    expect(row).toBeDefined();
    // total price 100, credit 20
    // item1 net = 30 - (20 * 30/100) = 30 - 6 = 24
    // item2 net = 70 - (20 * 70/100) = 70 - 14 = 56
    expect(row!.storeTotal).toBeCloseTo(24);
    expect(row!.depopTotal).toBeCloseTo(56);
    expect(row!.total).toBeCloseTo(80);
  });
});
