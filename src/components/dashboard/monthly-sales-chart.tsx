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
  // Recharts XAxis renders ticks as SVG <text>. Use a custom tick renderer
  // that returns tspan elements for multi-line labels (month on top, total below).
  const CustomTick = (props: any) => {
    const { x, y, payload } = props;
    const value = String(payload?.value ?? '');
    let line1 = value;
    let line2 = '';
    try {
      const d = parseISO(value);
      line1 = format(d, 'MMM');
      const entry = data.find((x) => x.date === value);
      const total = entry ? entry.total : 0;
      line2 = `$${total}`;
    } catch (e) {}
    return (
      <text x={x} y={y} textAnchor="middle" fontSize={16} className={styles.sometypeMono} dominantBaseline="hanging">
        <tspan x={x} dy={0}>{line1}</tspan>
        <tspan x={x} dy={20}>{line2}</tspan>
      </text>
    );
  };

  function MonthlyTooltip({ active, label, payload }: any) {
    if (!active || !payload || payload.length === 0) return null;
    const store = payload.find((p: any) => p.dataKey === 'storeTotal')?.value ?? 0;
    const depop = payload.find((p: any) => p.dataKey === 'depopTotal')?.value ?? 0;
    const total = +(Number(store) + Number(depop)).toFixed(2);
    let title = String(label);
    try {
      title = format(parseISO(String(label)), 'MMMM yyyy');
    } catch (e) {}
    return (
      <div className={[styles.sometypeMono, "bg-white p-3 rounded shadow"].join(" ")}>
        <div className="font-semibold text-lg">{title}</div>
        <div className="text-base mt-1">In-store: ${store.toFixed(2)}</div>
        <div className="text-base">Depop: ${depop.toFixed(2)}</div>
        <div className="border-t mt-2 pt-2 font-medium text-base">Total: ${total.toFixed(2)}</div>
      </div>
    );
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer>
          <BarChart data={data} margin={{ bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="date" tick={CustomTick} />

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
