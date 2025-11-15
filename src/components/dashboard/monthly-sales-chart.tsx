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

type Props = {
  data: { date: string; total: number }[]; // date should be ISO like YYYY-MM-01
};

export function MonthlySalesChart({ data }: Props) {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="date"
            tickFormatter={(date) => {
              try {
                const d = parseISO(String(date));
                return format(d, "MMM");
              } catch (e) {
                return String(date);
              }
            }}
          />

          <YAxis />
          <Tooltip
            labelFormatter={(date) => {
              try {
                return format(parseISO(String(date)), "MMMM yyyy");
              } catch (e) {
                return String(date);
              }
            }}
            formatter={(value) => [`$${(value as number).toFixed(2)}`, "Total Sales"]}
          />

          <Bar dataKey="total" fill="green" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
