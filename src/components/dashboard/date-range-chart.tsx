import { DateRangePicker } from "@/components/date-range-picker";
import { SalesChart } from "@/components/dashboard/sales-chart";
import styles from '@/styles/home.module.css';


export function DateRangeChart({ data }: { data: Array<{ date: string; total?: number; storeTotal?: number; depopTotal?: number }> }) {
    const totalSum = data.reduce((s, d) => {
        const net = typeof d.total === 'number' ? d.total : (Number(d.storeTotal ?? 0) + Number(d.depopTotal ?? 0));
        return s + net;
    }, 0);

    const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalSum);

    return (
        <div className={[styles.sometypeMono, "space-y-6"].join(" ")}>
            <h1 className="text-xl font-semibold">Sales (Daily)</h1>
            <DateRangePicker />
            <SalesChart data={data as any} />
            <div className="mt-4 text-center text-lg font-medium">Total Sales: {money}</div>
        </div>
    );
}