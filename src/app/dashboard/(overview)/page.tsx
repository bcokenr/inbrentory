import { getDailySales } from "@/lib/actions";
import { DateRangeChart } from "@/components/dashboard/date-range-chart";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const start = params.start
    ? new Date(params.start)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // default = last 7 days

  const end = params.end ? new Date(params.end) : new Date();

  const data = await getDailySales(start, end);
  return (
    <>
      <DateRangeChart data={data} />
    </>
  );
}