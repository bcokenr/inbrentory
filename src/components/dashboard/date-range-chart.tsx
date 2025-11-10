import { DateRangePicker } from "@/components/date-range-picker";
import { SalesChart } from "@/components/dashboard/sales-chart";

export function DateRangeChart({ data }: { data: { date: string; total: number }[] }) {
    return (
        <div className="space-y-6">
            <h1 className="text-xl font-semibold">Sales (Daily)</h1>
            <DateRangePicker />
            <SalesChart data={data} />
        </div>
    );
}