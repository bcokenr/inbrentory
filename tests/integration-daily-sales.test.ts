import { describe, it, expect, vi } from 'vitest';

// Mock the prisma module used by getDailySales
vi.mock('../src/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    item: { findMany: vi.fn() },
  },
}));

// Mock Next/Next-Auth server-only imports before importing the actions module
vi.mock('@/auth', () => ({ signIn: vi.fn() }));
vi.mock('next-auth', () => ({ AuthError: class extends Error {} }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

import { prisma } from '../src/lib/prisma';
import { zonedTimeToUtc } from 'date-fns-tz';

describe('getDailySales integration (mocked DB)', () => {
  it('returns a contiguous set of local date keys and maps totals correctly', async () => {
    // Dynamically import actions after mocks so server-only imports are stubbed
  const { getDailySales } = await import('../src/lib/actions.ts');

    // Simulate DB returning rows for a subset of days
    const rows = [
      { day: '2025-11-17', depop_total: '2.00', store_total: '3.00', total: '5.00' },
      { day: '2025-11-19', depop_total: '1.00', store_total: '4.00', total: '5.00' },
    ];

    (prisma.$queryRaw as any).mockResolvedValue(rows);

    const tz = 'America/Los_Angeles';
    // Simulate how the app constructs query bounds: interpret date-only strings as local midnight in tz
    const start = zonedTimeToUtc('2025-11-17T00:00:00', tz);
    const end = zonedTimeToUtc('2025-11-23T00:00:00', tz);

    const results = await getDailySales(start, end, tz);

    const expectedDates = ['2025-11-17', '2025-11-18', '2025-11-19', '2025-11-20', '2025-11-21', '2025-11-22', '2025-11-23'];
  expect(results.map((r: any) => r.date)).toEqual(expectedDates);

    // Check mapped totals for the days we returned from the DB
  const day17 = results.find((r: any) => r.date === '2025-11-17');
  const day19 = results.find((r: any) => r.date === '2025-11-19');
    expect(day17).toBeDefined();
    expect(day17!.total).toBeCloseTo(5);
    expect(day19).toBeDefined();
    expect(day19!.total).toBeCloseTo(5);
  });
});
