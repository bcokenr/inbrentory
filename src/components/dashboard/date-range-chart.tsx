import { DateRangePicker } from "@/components/date-range-picker";
import { SalesChart } from "@/components/dashboard/sales-chart";
import styles from '@/styles/home.module.css';


export function DateRangeChart({ data }: { data: { date: string; total: number }[] }) {
    return (
        <div className={[styles.sometypeMono, "space-y-6"].join(" ")}>
            <h1 className="text-xl font-semibold">Sales (Daily)</h1>
            <DateRangePicker />
            <SalesChart data={data} />
        </div>
    );
}