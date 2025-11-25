import { getDailySales, getMonthlySales, getWeeklySales } from "@/lib/actions";
import { DEFAULT_TZ } from '@/config/timezone';
import { DateRangeChart } from "@/components/dashboard/date-range-chart";
import { WeeklySalesChart } from "@/components/dashboard/weekly-sales-chart";
import { MonthlySalesChart } from "@/components/dashboard/monthly-sales-chart";
import { parseLocalDate } from "@/lib/utils";
import { startOfWeek, endOfWeek } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import styles from '@/styles/home.module.css';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; month?: string; year?: string }>;
}) {
  const params = await searchParams as { start?: string; end?: string; month?: string; year?: string };
  const tz = DEFAULT_TZ;
  const now = new Date();
  // compute week boundaries in the configured timezone (Monday-Sunday)
  const zonedNow = utcToZonedTime(now, tz);
  const zonedStart = startOfWeek(zonedNow, { weekStartsOn: 1 }); // Monday in tz
  const zonedEnd = endOfWeek(zonedNow, { weekStartsOn: 1 }); // Sunday in tz

  // If the user supplied start/end via query params they are date-only strings
  // (YYYY-MM-DD). We need to interpret those as wall-time (midnight) in the
  // configured timezone and convert to UTC instants for DB queries. Use
  // zonedTimeToUtc on an explicit 'YYYY-MM-DDT00:00:00' string to avoid passing
  // a local Date object into utcToZonedTime later which would be misinterpreted.
  const start = params.start
    ? zonedTimeToUtc(`${params.start}T00:00:00`, tz)
    : zonedTimeToUtc(zonedStart, tz);

  const end = params.end
    ? zonedTimeToUtc(`${params.end}T00:00:00`, tz)
    : zonedTimeToUtc(zonedEnd, tz);

  const data = await getDailySales(start, end);
  const monthly = await getMonthlySales(new Date().getFullYear());
  // Determine month/year for weekly chart from query params if present,
  // otherwise default to the current month in the configured timezone.
  const nowZoned = utcToZonedTime(new Date(), tz);
  const defaultYear = nowZoned.getFullYear();
  const defaultMonth = nowZoned.getMonth() + 1;
  const qsYear = params.year ? Number(params.year) : undefined;
  const qsMonth = params.month ? Number(params.month) : undefined;
  const currentYear = qsYear ?? defaultYear;
  const currentMonth = qsMonth ?? defaultMonth;
  const weekly = await getWeeklySales(currentYear, currentMonth, tz);
  return (
    <>
      <DateRangeChart data={data} />
      <div className="pt-6 mt-6">
        <h2 className={[styles.sometypeMono, "text-xl font-semibold"].join(" ")}>Sales (Weekly)</h2>
        {/* Weekly chart will be a client component and will accept initial data */}
        {/* eslint-disable-next-line @next/next/no-typos */}
        {/* @ts-ignore */}
        <WeeklySalesChart initialData={weekly} initialYear={currentYear} initialMonth={currentMonth} />
      </div>
      <div className="pt-6 mt-8">
        <h2 className={[styles.sometypeMono, "text-xl font-semibold"].join(" ")}>Sales (Monthly)</h2>
        <MonthlySalesChart data={monthly} />
      </div>
    </>
  );
}