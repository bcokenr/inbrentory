import { getDailySales, getMonthlySales } from "@/lib/actions";
import { DateRangeChart } from "@/components/dashboard/date-range-chart";
import { MonthlySalesChart } from "@/components/dashboard/monthly-sales-chart";
import { parseLocalDate } from "@/lib/utils";
import styles from '@/styles/home.module.css';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const start = params.start
    ? parseLocalDate(params.start)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const end = params.end
    ? parseLocalDate(params.end)
    : new Date();

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