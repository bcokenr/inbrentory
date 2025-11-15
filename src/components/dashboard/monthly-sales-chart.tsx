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

  return (
    <div className="w-full h-72">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="date" tickFormatter={tickFormatter} />

          <YAxis />
          <Tooltip
            labelFormatter={(date) => {
              try {
                return format(parseISO(String(date)), "MMMM yyyy");
              } catch (e) {
                return String(date);
              }
            }}
            // Use the provided `name` (series name) to map to clearer labels
            formatter={(value: any, name: any) => {
              const label = name === 'Depop' ? 'Depop total' : name === 'In-store' ? 'In-store total' : String(name);
              return [`$${(value as number).toFixed(2)}`, label];
            }}
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
