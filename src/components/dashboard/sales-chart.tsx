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
    <div className="bg-white p-2 rounded shadow">
      <div className="font-semibold">{label}</div>
      <div className="text-sm">In-store: ${store.toFixed(2)}</div>
      <div className="text-sm">Depop: ${depop.toFixed(2)}</div>
      <div className="border-t mt-1 pt-1 font-medium">Total: ${total.toFixed(2)}</div>
    </div>
  );
}

export function SalesChart({ data }: Props) {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="date"
            tickFormatter={(date) => {
              const d = parseISO(date);
              return `${format(d, "EEE")}\n${format(d, "MM/dd")}`;
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
