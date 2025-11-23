"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { parseISO, format } from "date-fns";
import styles from '@/styles/home.module.css';

type MonthlyRow = {
  date: string; // YYYY-MM-01
  storeTotal: number;
  depopTotal: number;
  total: number;
  count: number;
};

type Props = {
  data: MonthlyRow[];
};

export function MonthlySalesChart({ data }: Props) {
  // helper to format x-axis ticks to show month and count underneath
  const tickFormatter = (date: string | number) => {
    try {
      const d = parseISO(String(date));
      const monthLabel = format(d, "MMM");
      const entry = data.find((x) => x.date === String(date));
      const total = entry ? entry.total : 0;
      // Recharts accepts multiline tick labels using `\n`
      return `${monthLabel}\n\$${total}`;
    } catch (e) {
      return String(date);
    }
  };

  function MonthlyTooltip({ active, label, payload }: any) {
    if (!active || !payload || payload.length === 0) return null;
    const store = payload.find((p: any) => p.dataKey === 'storeTotal')?.value ?? 0;
    const depop = payload.find((p: any) => p.dataKey === 'depopTotal')?.value ?? 0;
    const total = +(Number(store) + Number(depop)).toFixed(2);
    let title = String(label);
    try {
      title = format(parseISO(String(label)), 'MMMM yyyy');
    } catch (e) {
      // fallback to raw label
    }
    return (
      <div className={[styles.sometypeMono, "bg-white p-2 rounded shadow"].join(" ")}>
        <div className="font-semibold">{title}</div>
        <div className="text-sm">In-store: ${store.toFixed(2)}</div>
        <div className="text-sm">Depop: ${depop.toFixed(2)}</div>
        <div className="border-t mt-1 pt-1 font-medium">Total: ${total.toFixed(2)}</div>
      </div>
    );
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="date" tickFormatter={tickFormatter} />

          <YAxis />
          <Tooltip content={<MonthlyTooltip />} />

          {/* Bottom portion: in-store sales (lighter green) */}
          <Bar dataKey="storeTotal" stackId="a" fill="#34D399" name="In-store" />
          {/* Top portion: depop sales (darker green) */}
          <Bar dataKey="depopTotal" stackId="a" fill="#059669" name="Depop" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
