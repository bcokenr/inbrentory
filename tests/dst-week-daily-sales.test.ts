import { describe, it, expect, vi } from 'vitest';

// Mock prisma and Next server-only imports before importing the actions module
vi.mock('../src/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    item: { findMany: vi.fn() },
  },
}));

vi.mock('@/auth', () => ({ signIn: vi.fn() }));
vi.mock('next-auth', () => ({ AuthError: class extends Error {} }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

import { prisma } from '../src/lib/prisma';
import { zonedTimeToUtc } from 'date-fns-tz';

describe('getDailySales across DST transition (Oct 27 - Nov 2, 2025)', () => {
  it('returns contiguous local-date keys with no duplicates', async () => {
    const { getDailySales } = await import('../src/lib/actions.ts');

    // Simulate DB returning rows only for a subset of days (as in prod logs)
    const rows = [
      { day: '2025-10-29', depop_total: '1.00', store_total: '2.00', total: '3.00' },
      { day: '2025-10-30', depop_total: '0.00', store_total: '4.00', total: '4.00' },
      { day: '2025-10-31', depop_total: '0.00', store_total: '1.00', total: '1.00' },
      { day: '2025-11-01', depop_total: '2.00', store_total: '0.00', total: '2.00' },
      { day: '2025-11-02', depop_total: '0.00', store_total: '5.00', total: '5.00' },
    ];

    (prisma.$queryRaw as any).mockResolvedValue(rows);

    const tz = 'America/Los_Angeles';
    const start = zonedTimeToUtc('2025-10-27T00:00:00', tz);
    const end = zonedTimeToUtc('2025-11-02T00:00:00', tz);

    const results = await getDailySales(start, end, tz);

    const expectedDates = [
      '2025-10-27',
      '2025-10-28',
      '2025-10-29',
      '2025-10-30',
      '2025-10-31',
      '2025-11-01',
      '2025-11-02',
    ];

    expect(results.map((r: any) => r.date)).toEqual(expectedDates);
    // ensure no duplicates
    const unique = Array.from(new Set(results.map((r: any) => r.date)));
    expect(unique.length).toBe(expectedDates.length);
  });
});
