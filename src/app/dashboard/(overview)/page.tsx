import { getDailySales, getMonthlySales } from "@/lib/actions";
import { DEFAULT_TZ } from '@/config/timezone';
import { DateRangeChart } from "@/components/dashboard/date-range-chart";
import { MonthlySalesChart } from "@/components/dashboard/monthly-sales-chart";
import { parseLocalDate } from "@/lib/utils";
import { startOfWeek, endOfWeek } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import styles from '@/styles/home.module.css';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const tz = DEFAULT_TZ;
  const now = new Date();
  // compute week boundaries in the configured timezone (Monday-Sunday)
  const zonedNow = utcToZonedTime(now, tz);
  const zonedStart = startOfWeek(zonedNow, { weekStartsOn: 1 }); // Monday in tz
  const zonedEnd = endOfWeek(zonedNow, { weekStartsOn: 1 }); // Sunday in tz

  const start = params.start
    ? parseLocalDate(params.start)
    : zonedTimeToUtc(zonedStart, tz);

  const end = params.end
    ? parseLocalDate(params.end)
    : zonedTimeToUtc(zonedEnd, tz);

  const data = await getDailySales(start, end);
  const monthly = await getMonthlySales(new Date().getFullYear());
  return (
    <>
      <DateRangeChart data={data} />
      <div className="pt-6">
        <h2 className={[styles.sometypeMono, "text-xl font-semibold"].join(" ")}>Sales (Monthly)</h2>
        <MonthlySalesChart data={monthly} />
      </div>
    </>
  );
}