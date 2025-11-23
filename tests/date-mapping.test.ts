import { describe, it, expect } from 'vitest';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';
import { DEFAULT_TZ } from '../src/config/timezone';

describe('date mapping for dashboard weekly ranges', () => {
  it('interprets YYYY-MM-DD as midnight in DEFAULT_TZ and round-trips', () => {
    const date = '2025-11-17';
    const utc = zonedTimeToUtc(`${date}T00:00:00`, DEFAULT_TZ);
    const zoned = utcToZonedTime(utc, DEFAULT_TZ);
    const key = format(zoned, 'yyyy-MM-dd');
    expect(key).toBe(date);
  });

  it('works for several sample dates including DST boundaries', () => {
    const samples = ['2025-03-09', '2025-03-10', '2025-11-02', '2025-11-03'];
    for (const d of samples) {
      const utc = zonedTimeToUtc(`${d}T00:00:00`, DEFAULT_TZ);
      const zoned = utcToZonedTime(utc, DEFAULT_TZ);
      expect(format(zoned, 'yyyy-MM-dd')).toBe(d);
    }
  });
});
