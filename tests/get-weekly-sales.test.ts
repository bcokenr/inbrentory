import { describe, it, expect, vi } from 'vitest';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { addDays, format } from 'date-fns';

// Mock prisma and Next server-only imports before importing actions
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

describe('getWeeklySales', () => {
  it('returns weeks (Mon-Sun) labeled by the Sunday that ends inside the requested month', async () => {
    // Ensure prisma raw query returns no rows so getDailySales will produce zeroed days
    (prisma.$queryRaw as any).mockResolvedValue([]);

    const tz = 'America/Los_Angeles';
    const year = 2025;
    const month = 11; // November 2025

    // Dynamically import actions after mocks
    const { getWeeklySales } = await import('../src/lib/actions.ts');

    const results = await getWeeklySales(year, month, tz);

    // Build expected list of Sundays inside November 2025 in the target tz
    const monthStartUtc = zonedTimeToUtc(`${year}-${String(month).padStart(2, '0')}-01T00:00:00`, tz);
    const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthEndUtc = zonedTimeToUtc(`${nextMonth}-01T00:00:00`, tz);

    const monthStartZoned = utcToZonedTime(monthStartUtc, tz);
    const monthEndZoned = utcToZonedTime(new Date(monthEndUtc.getTime() - 1), tz);

    const expectedSundays: string[] = [];
    let cursor = monthStartZoned;
    while (cursor <= monthEndZoned) {
      if (cursor.getDay() === 0) {
        expectedSundays.push(format(cursor, 'yyyy-MM-dd'));
      }
      cursor = addDays(cursor, 1);
    }

    // dates should match
    expect(results.map((r: any) => r.date)).toEqual(expectedSundays);

    // totals should be zero because DB returned no rows
    for (const r of results) {
      expect(r.storeTotal).toBe(0);
      expect(r.depopTotal).toBe(0);
      expect(r.total).toBe(0);
    }
  });
});
