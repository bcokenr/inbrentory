import { getDailySales } from "@/lib/actions";
import { DateRangeChart } from "@/components/dashboard/date-range-chart";
import { parseLocalDate } from "@/lib/utils";

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
  return (
    <>
      <DateRangeChart data={data} />
    </>
  );
}