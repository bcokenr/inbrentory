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

type Props = {
  data: { date: string; total: number }[];
};

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
            labelFormatter={(date) => format(parseISO(date), "EEEE, MMM d")}
            formatter={(value) => [`$${(value as number).toFixed(2)}`, "Total Sales"]}
          />

          {/* You explicitly requested green, so we are allowed to set it */}
          <Bar dataKey="total" fill="green" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
