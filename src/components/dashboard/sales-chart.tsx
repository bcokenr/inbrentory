"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";
import { format, parseISO } from "date-fns";
import styles from '@/styles/home.module.css';

type DailyRow = { date: string; storeTotal: number; depopTotal: number; total: number };
type Props = {
  data: DailyRow[];
};

  function DailyTooltip({ active, label, payload }: any) {
  if (!active || !payload || payload.length === 0) return null;
  // payload contains entries for each series (In-store, Depop)
  const store = payload.find((p: any) => p.dataKey === 'storeTotal')?.value ?? 0;
  const depop = payload.find((p: any) => p.dataKey === 'depopTotal')?.value ?? 0;
  const total = +(Number(store) + Number(depop)).toFixed(2);
  return (
    <div className={[styles.sometypeMono, "bg-white p-4 rounded shadow"].join(" ")}>
      <div className="font-semibold text-xl">{label}</div>
      <div className="text-lg mt-1">In-store: ${store.toFixed(2)}</div>
      <div className="text-lg">Depop: ${depop.toFixed(2)}</div>
      <div className="border-t mt-2 pt-2 font-medium text-lg">Total: ${total.toFixed(2)}</div>
    </div>
  );
}

export function SalesChart({ data }: Props) {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer>
          <BarChart data={data} margin={{ bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="date"
            tick={(props) => {
              const { x, y, payload } = props as any;
              const date = payload?.value;
              const d = parseISO(String(date));
              return (
                <text x={x} y={y} textAnchor="middle" fontSize={16} className={styles.sometypeMono} fill="#374151" dominantBaseline="hanging">
                  <tspan x={x} dy={0} className="uppercase font-semibold">{format(d, "EEE")}</tspan>
                  <tspan x={x} dy={20}>{format(d, "MM/dd")}</tspan>
                </text>
              );
            }}
          />

          <YAxis />
          <Tooltip
            content={<DailyTooltip />}
            labelFormatter={(date) => format(parseISO(String(date)), "EEEE, MMM d")}
          />

          {/* Bottom portion: in-store sales (lighter green) */}
          <Bar dataKey="storeTotal" stackId="a" fill="#34D399" name="In-store" />
          {/* Top portion: depop sales (darker green) */}
          <Bar dataKey="depopTotal" stackId="a" fill="#059669" name="Depop" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
